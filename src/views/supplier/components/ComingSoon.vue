<template>
  <div class="coming-soon">
    <el-result icon="info" title="功能建设中" sub-title="该节点（审核计划 / 物料变更）将于后续版本开放，敬请期待。">
      <template #extra>
        <el-tag type="info" effect="plain">建设中</el-tag>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.coming-soon {
  padding: 32px 0;
}
</style>
