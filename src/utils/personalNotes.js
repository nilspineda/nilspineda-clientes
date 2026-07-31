import pb from '@/lib/pocketbaseClient'

const COLLECTION = 'personal_notes'

export async function fetchNotes() {
  return pb.collection(COLLECTION).getFullList({
    sort: '-updated',
    expand: 'user_id',
  })
}

export async function getNote(id) {
  return pb.collection(COLLECTION).getOne(id)
}

export async function createNote({ title, content }) {
  return pb.collection(COLLECTION).create({
    title,
    content,
    user_id: pb.authStore.model?.id,
  })
}

export async function updateNote(id, { title, content }) {
  return pb.collection(COLLECTION).update(id, {
    title,
    content,
  })
}

export async function deleteNote(id) {
  return pb.collection(COLLECTION).delete(id)
}
