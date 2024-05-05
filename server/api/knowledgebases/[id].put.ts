import prisma from '@/server/utils/prisma'
import {isOllamaModelExists, isApiEmbeddingModelExists} from '@/server/utils/models'
import {getOllama} from '@/server/utils/ollama'
import {deleteDocuments, ingestDocument, ingestURLs} from '~/server/utils/rag'
import {parseKnowledgeBaseFormRequest} from '@/server/utils/http'
import {requireKnowledgeBase, requireKnowledgeBaseOwner} from '~/server/utils/knowledgeBase'

export default defineEventHandler(async (event) => {
  const {knowledgeBaseId, uploadedFiles, urls, name, description, isPublic} = await parseKnowledgeBaseFormRequest(event)

  console.log("Knowledge base ID: ", knowledgeBaseId)

  const knowledgeBase = await requireKnowledgeBase(`${knowledgeBaseId}`)
  requireKnowledgeBaseOwner(event, knowledgeBase)

  if (uploadedFiles.length > 0 || urls.length > 0) {
    if (!isApiEmbeddingModelExists(knowledgeBase.embedding!)) {
      const ollama = await getOllama(event, true)
      if (!ollama) return
      if (!(await isOllamaModelExists(ollama, knowledgeBase.embedding!))) {
        setResponseStatus(event, 404)
        return {
          status: "error",
          message: "Embedding model does not exist in Ollama"
        }
      }
    }

    console.log(`Update knowledge base ${knowledgeBase.name} with ID ${knowledgeBase.id}`)

    try {
      let updateIds: string[] = []
      for (const url of urls) {
        let data = await prisma.knowledgeBaseFile.findFirst({
          where: {
            url: {
              equals: url
            }
          }
        })
        updateIds.push(data!.documentId)
        console.log(data)
      }

      for (const url of uploadedFiles) {
        let data = await prisma.knowledgeBaseFile.findFirst({
          where: {
            url: {
              equals: url.filename
            }
          }
        })
        updateIds.push(data!.documentId)
        console.log(data)
      }
      console.log("updateIds:", updateIds)
      if (updateIds.length > 0) {
        await deleteDocuments(`collection_${knowledgeBase.id}`, knowledgeBase.embedding!, updateIds, event)
        for (const id of updateIds) {
          await prisma.knowledgeBaseFile.deleteMany(
            {
              where: {
                documentId: id,
              }
            }
          )
        }
      }

      let ids = await ingestDocument(uploadedFiles, `collection_${knowledgeBase.id}`, knowledgeBase.embedding!, event)
      let count = 0
      for (const uploadedFile of uploadedFiles) {
        const createdKnowledgeBaseFile = await prisma.knowledgeBaseFile.create({
          data: {
            url: uploadedFile.filename!,
            knowledgeBaseId: knowledgeBase.id,
            documentId: ids![count]
          }
        })
        count++
        console.log("Knowledge base file created with ID: ", createdKnowledgeBaseFile.id)
      }

      let urlDocuments = await ingestURLs(urls, `collection_${knowledgeBase.id}`, knowledgeBase.embedding!, event)
      for (const url of urlDocuments) {
        const createdKnowledgeBaseFile = await prisma.knowledgeBaseFile.create({
          data: {
            url: url.url,
            knowledgeBaseId: knowledgeBase.id,
            documentId: ids![count]
          }
        })

        console.log("Knowledge base file created with ID: ", createdKnowledgeBaseFile.id)
      }
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  await prisma.knowledgeBase.update({
    where: {id: knowledgeBaseId!},
    data: {name, description, is_public: isPublic}
  })

  return {
    status: "success"
  }
})
