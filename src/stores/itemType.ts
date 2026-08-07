/**
 * 产品/物料分类共享 Store
 * FAI 与 SPC 共用同一份分类记忆，并持久化到 localStorage，保证：
 * 1. 进入 FAI 时继承上一次的选择（产品/物料），不再出现空分类导致的混合展示；
 * 2. 任一模块切换分类后，另一模块同步继承，避免用户重复选择。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ItemType = 'PRODUCT' | 'MATERIAL'

const STORAGE_KEY = 'qms:itemType'
const DEFAULT_ITEM_TYPE: ItemType = 'PRODUCT'

/** 读取持久化分类；隐私模式/配额异常或值非法时回退默认值 */
function readPersisted(): ItemType {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'PRODUCT' || raw === 'MATERIAL') return raw
  } catch {
    // localStorage 不可用时静默回退，不影响页面渲染
  }
  return DEFAULT_ITEM_TYPE
}

function writePersisted(value: ItemType): void {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // 持久化失败不阻断交互，本次会话仍以内存值为准
  }
}

export const useItemTypeStore = defineStore('itemType', () => {
  const itemType = ref<ItemType>(readPersisted())

  function setItemType(value: ItemType): void {
    if (value !== 'PRODUCT' && value !== 'MATERIAL') return
    itemType.value = value
    writePersisted(value)
  }

  /** 分类中文名，用于动态标签（如「产品名称」/「物料名称」） */
  function labelOf(value: ItemType = itemType.value): string {
    return value === 'PRODUCT' ? '产品' : '物料'
  }

  return { itemType, setItemType, labelOf }
})
