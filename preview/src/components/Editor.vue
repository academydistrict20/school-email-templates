<template>
  <v-ace-editor
    v-model:value="code"
    lang="html"
    theme="nord_dark" />
</template>

<script setup>
import { defineEmits } from 'vue'
import { VAceEditor } from 'vue3-ace-editor';
import { useVModel} from '@vueuse/core'
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/theme-nord_dark';

const props = defineProps({
  value: {
    type: String,
    default: '<h1>Hello World</h1>'
  }
})

const emit = defineEmits(['update:value'])

const code = useVModel(props, 'value', emit)
</script>

<style>
.ace_editor {
  height: 100%;
}
</style>