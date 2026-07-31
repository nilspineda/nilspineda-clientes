import pb from '@/lib/pocketbaseClient'

const COLLECTION = 'personal_notes'

export async function fetchNotes() {
  return pb.collection(COLLECTION).getFullList({
    sort: '-updated',
    expand: 'user_id',
    requestKey: null,
  })
}

export async function getNote(id) {
  return pb.collection(COLLECTION).getOne(id)
}

export async function createNote({ title, content, category }) {
  return pb.collection(COLLECTION).create({
    title,
    content,
    category: category || null,
    user_id: pb.authStore.model?.id,
  })
}

export async function updateNote(id, { title, content, category }) {
  const data = {}
  if (title !== undefined) data.title = title
  if (content !== undefined) data.content = content
  if (category !== undefined) data.category = category || null
  return pb.collection(COLLECTION).update(id, data)
}

export async function deleteNote(id) {
  return pb.collection(COLLECTION).delete(id)
}
