<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface ToolCard {
  key: string
  title: string
  desc: string
  icon: string
  path: string
  accent: string
}

const tools: ToolCard[] = [
  {
    key: 'fmea',
    title: 'FMEA 风险跟踪',
    desc: '失效模式与影响分析：量化严重度 / 频度 / 探测度，计算 RPN 风险优先级，跟踪措施完成率与高风险项。',
    icon: 'WarningFilled',
    path: '/process-tools/fmea',
    accent: '#B84B3E',
  },
  {
    key: 'fishbone',
    title: '鱼骨图分析',
    desc: '人机料法环测因果分析：以树形结构梳理潜在原因，标记并确认根本原因，与 8D D4 根因分析联动。',
    icon: 'Share',
    path: '/process-tools/fishbone',
    accent: '#3E7A4E',
  },
]
</script>

<template>
  <div class="pt-page">
    <div class="pt-header">
      <h2 class="pt-title">过程工具</h2>
      <p class="pt-subtitle">质量分析与根因排查工具集（FMEA 风险跟踪 · 鱼骨图分析）</p>
    </div>

    <div class="pt-grid">
      <el-card
        v-for="tool in tools"
        :key="tool.key"
        class="pt-card"
        shadow="hover"
        @click="router.push(tool.path)"
      >
        <div class="pt-card-inner">
          <div class="pt-icon" :style="{ background: tool.accent }">
            <el-icon :size="28"><component :is="tool.icon" /></el-icon>
          </div>
          <div class="pt-card-body">
            <h3 class="pt-card-title">{{ tool.title }}</h3>
            <p class="pt-card-desc">{{ tool.desc }}</p>
            <el-button type="primary" plain class="pt-enter">
              进入工具
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pt-page {
  padding: 24px;
}
.pt-header {
  margin-bottom: 24px;
}
.pt-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1b3a5b;
  letter-spacing: 1px;
}
.pt-subtitle {
  margin: 6px 0 0;
  color: #5b7a99;
  font-size: 14px;
}
.pt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}
.pt-card {
  cursor: pointer;
  border-radius: 12px;
  border-top: 3px solid transparent;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  &:hover {
    transform: translateY(-4px);
  }
}
.pt-card-inner {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.pt-icon {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.pt-card-body {
  flex: 1;
}
.pt-card-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
  color: #1b3a5b;
}
.pt-card-desc {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.7;
  color: #5b7a99;
}
.pt-enter {
  font-weight: 600;
}
</style>
