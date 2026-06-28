import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

dotenv.config({ path: '.env.server' })

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (serviceAccountPath) {
    return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
  }

  throw new Error('Defina FIREBASE_SERVICE_ACCOUNT_JSON na Vercel ou FIREBASE_SERVICE_ACCOUNT_PATH no PC')
}

const adminPassword = process.env.ADMIN_PASSWORD || 'bandfm123'
const jwtSecret = process.env.JWT_SECRET || 'trocar-jwt-secret'

if (!getApps().length) {
  initializeApp({ credential: cert(loadServiceAccount()) })
}

const db = getFirestore()
const app = express()

app.use(cors())
app.use(express.json())

function requireAdminAuth(request, response, next) {
  const authHeader = request.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    response.status(401).json({ message: 'Nao autorizado' })
    return
  }

  try {
    const decoded = jwt.verify(token, jwtSecret)
    if (decoded.role !== 'admin') {
      response.status(403).json({ message: 'Acesso negado' })
      return
    }
    next()
  } catch {
    response.status(401).json({ message: 'Token invalido' })
  }
}

app.post('/api/admin/login', (request, response) => {
  const { password } = request.body || {}
  if (password !== adminPassword) {
    response.status(401).json({ message: 'Senha invalida' })
    return
  }

  const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '10h' })
  response.json({ token })
})

app.get('/api/polls', requireAdminAuth, async (_request, response) => {
  const snapshot = await db.collection('polls').orderBy('createdAt', 'desc').get()
  const rows = snapshot.docs.map((row) => ({ id: row.id, ...row.data() }))
  response.json(rows)
})

app.get('/api/polls/:pollId', async (request, response) => {
  const snapshot = await db.collection('polls').doc(request.params.pollId).get()
  if (!snapshot.exists) {
    response.status(404).json({ message: 'Campanha nao encontrada' })
    return
  }
  response.json({ id: snapshot.id, ...snapshot.data() })
})

function normalizeOptions(options) {
  return options
    .map((option) => ({
      id: option.id || randomUUID(),
      text: String(option.text || '').trim(),
      votes: Number.isFinite(option.votes) ? option.votes : 0,
    }))
    .filter((option) => option.text.length > 0)
}

app.post('/api/polls', requireAdminAuth, async (request, response) => {
  const { campaignName, question, options, participationFields, tvLabel } = request.body || {}

  if (!campaignName || !question || !Array.isArray(options)) {
    response.status(400).json({ message: 'Dados invalidos para campanha' })
    return
  }

  const cleanOptions = normalizeOptions(options)
  if (cleanOptions.length < 2) {
    response.status(400).json({ message: 'Cadastre pelo menos duas opcoes' })
    return
  }

  const now = FieldValue.serverTimestamp()
  const created = await db.collection('polls').add({
    campaignName: String(campaignName).trim(),
    question: String(question).trim(),
    options: cleanOptions.map((option) => ({ ...option, votes: 0 })),
    participationFields:
      Array.isArray(participationFields) && participationFields.length > 0
        ? participationFields
        : ['Nome'],
    tvLabel: tvLabel || 'BAND FM JUINA',
    status: 'open',
    createdAt: now,
    updatedAt: now,
  })

  response.status(201).json({ id: created.id })
})

app.put('/api/polls/:pollId', requireAdminAuth, async (request, response) => {
  const { campaignName, question, options, participationFields, tvLabel, status } =
    request.body || {}

  const pollRef = db.collection('polls').doc(request.params.pollId)

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(pollRef)
      if (!snapshot.exists) {
        throw new Error('not-found')
      }

      const current = snapshot.data()
      const updates = { updatedAt: FieldValue.serverTimestamp() }

      if (campaignName !== undefined) updates.campaignName = String(campaignName).trim()
      if (question !== undefined) updates.question = String(question).trim()
      if (tvLabel !== undefined) updates.tvLabel = tvLabel || 'BAND FM JUINA'
      if (status !== undefined) updates.status = status === 'closed' ? 'closed' : 'open'
      if (Array.isArray(participationFields)) {
        const cleanFields = participationFields.map((field) => String(field).trim()).filter(Boolean)
        updates.participationFields = cleanFields.length > 0 ? cleanFields : ['Nome']
      }

      if (Array.isArray(options)) {
        const cleanOptions = normalizeOptions(options)
        if (cleanOptions.length < 2) {
          throw new Error('min-options')
        }

        const previousVotes = new Map(
          (current.options || []).map((option) => [option.id, option.votes || 0]),
        )

        updates.options = cleanOptions.map((option) => ({
          ...option,
          votes: previousVotes.has(option.id) ? previousVotes.get(option.id) : 0,
        }))
      }

      transaction.update(pollRef, updates)
    })

    response.json({ ok: true })
  } catch (error) {
    if (error.message === 'not-found') {
      response.status(404).json({ message: 'Campanha nao encontrada' })
      return
    }
    if (error.message === 'min-options') {
      response.status(400).json({ message: 'Cadastre pelo menos duas opcoes' })
      return
    }
    console.error(error)
    response.status(500).json({ message: 'Erro ao atualizar campanha' })
  }
})

async function deleteCollection(ref, batchSize = 200) {
  const snapshot = await ref.limit(batchSize).get()
  if (snapshot.empty) return

  const batch = db.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()

  if (snapshot.size >= batchSize) {
    await deleteCollection(ref, batchSize)
  }
}

app.delete('/api/polls/:pollId', requireAdminAuth, async (request, response) => {
  try {
    const pollRef = db.collection('polls').doc(request.params.pollId)
    const snapshot = await pollRef.get()

    if (!snapshot.exists) {
      response.status(404).json({ message: 'Campanha nao encontrada' })
      return
    }

    await deleteCollection(pollRef.collection('voters'))
    await deleteCollection(pollRef.collection('submissions'))
    await pollRef.delete()

    response.json({ ok: true })
  } catch (error) {
    console.error(error)
    response.status(500).json({ message: 'Erro ao excluir campanha' })
  }
})

app.post('/api/polls/:pollId/vote', async (request, response) => {
  const { selectedOption, participantData, voterId } = request.body || {}
  if (!selectedOption) {
    response.status(400).json({ message: 'Selecione uma opcao' })
    return
  }
  if (!voterId) {
    response.status(400).json({ message: 'Identificador de votante ausente' })
    return
  }

  const pollRef = db.collection('polls').doc(request.params.pollId)
  const voterRef = pollRef.collection('voters').doc(String(voterId))

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(pollRef)
      if (!snapshot.exists) {
        throw new Error('not-found')
      }

      const poll = snapshot.data()
      if (poll.status === 'closed') {
        throw new Error('closed')
      }

      const voterSnapshot = await transaction.get(voterRef)
      if (voterSnapshot.exists) {
        throw new Error('already-voted')
      }

      const optionExists = (poll.options || []).some((option) => option.id === selectedOption)
      if (!optionExists) {
        throw new Error('invalid-option')
      }

      const updatedOptions = (poll.options || []).map((option) =>
        option.id === selectedOption ? { ...option, votes: (option.votes || 0) + 1 } : option,
      )

      transaction.update(pollRef, {
        options: updatedOptions,
        updatedAt: FieldValue.serverTimestamp(),
      })

      transaction.set(voterRef, {
        selectedOption,
        participantData: participantData || {},
        createdAt: FieldValue.serverTimestamp(),
      })
    })

    response.json({ ok: true })
  } catch (error) {
    const map = {
      'not-found': [404, 'Campanha nao encontrada'],
      closed: [409, 'Esta enquete foi encerrada'],
      'already-voted': [409, 'Este dispositivo ja votou nesta enquete'],
      'invalid-option': [400, 'Opcao invalida'],
    }
    const [code, message] = map[error.message] || [500, 'Erro ao registrar voto']
    if (code === 500) console.error(error)
    response.status(code).json({ message })
  }
})

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

export default app
