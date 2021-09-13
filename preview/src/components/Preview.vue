<template>
  <div class="preview" v-html="html"></div>
</template>

<script setup>
defineProps({
  html: {
    type: String,
    default: '<h1>Hello World</h1>'
  }
})
</script>

<style scoped>
.preview {
  overflow: auto;
}
</style>