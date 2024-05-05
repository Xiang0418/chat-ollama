<script setup lang="ts">
import {useStorage} from "@vueuse/core";

const knowBaseId = useStorage<number>('knowBaseId', -1)
const { data, refresh } = await useFetch(`/api/knowledgebases/${knowBaseId}`)
const knowledgeBase = data.value?.knowledgeBase

</script>

<template>
  <div class="max-w-6xl mx-auto">
    <div class="flex items-center mb-4">
      <h2 class="font-bold text-xl mr-auto">Knowledge Bases</h2>
      <UButton icon="i-material-symbols-add" >Create</UButton>
    </div>
    <ClientOnly>
      <UTable :columns="columns" :rows="knowledgeBase.files" class="table-list">
        <template #name-data="{ row }">
          <ULink class="text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 underline text-wrap text-left"
                 @click="onStartChat(row)">
            {{ row.name }}
          </ULink>
        </template>

        <template #files-data="{ row }">
          <div class="inline-flex">
            <UPopover mode="hover" :popper="{ placement: 'right' }">
              <UButton color="primary" variant="soft" :label="'' + row.files.length" @click="onIndexedFiles(row)" />
              <template #panel>
                <ul class="p-2 list-inside">
                  <li v-for="el, i in row.files" :key="el.id" class="list-disc list-inside my-1 p-1">
                    {{ el.url }}
                  </li>
                </ul>
              </template>
            </UPopover>
          </div>
        </template>
        <template #description-data="{ row }">
          <span class="text-wrap">{{ row.description }}</span>
        </template>
        <template #actions-data="{ row }">
          <div class="action-btn invisible flex">
            <UTooltip text="Update">
              <UButton icon="i-heroicons-pencil-square-solid" variant="ghost" class="mx-1" @click="onShowUpdate(row)" />
            </UTooltip>
            <UTooltip text="Delete">
              <UButton color="red" icon="i-heroicons-trash-20-solid" variant="ghost" class="mx-1"
                       @click="onDelete(row)" />
            </UTooltip>
          </div>
        </template>
      </UTable>
    </ClientOnly>
  </div>
</template>

<style scoped lang="scss">

</style>
