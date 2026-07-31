import pb from '@/lib/pocketbaseClient'

const COLLECTION = 'personal_note_categories'

export async function fetchCategories() {
  return pb.collection(COLLECTION).getFullList({
    sort: '+name',
    requestKey: null,
  })
}

export async function createCategory(name, color) {
  return pb.collection(COLLECTION).create({
    name,
    color: color || null,
    user_id: pb.authStore.model?.id,
  })
}

export async function renameCategory(id, name) {
  return pb.collection(COLLECTION).update(id, { name })
}

export async function deleteCategory(id) {
  const notes = await pb.collection('personal_notes').getFullList({
    filter: `category = "${id}"`,
    requestKey: null,
  })
  for (const n of notes) {
    await pb.collection('personal_notes').update(n.id, { category: null })
  }
  return pb.collection(COLLECTION).delete(id)
}
