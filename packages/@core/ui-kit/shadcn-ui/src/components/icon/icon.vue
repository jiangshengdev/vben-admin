<script setup lang="ts">
import type { Component } from 'vue';

import { computed } from 'vue';

import { IconDefault, IconifyIcon } from '@vben-core/icons';
import {
  isFunction,
  isHttpUrl,
  isObject,
  isString,
} from '@vben-core/shared/utils';

const props = defineProps<{
  // 没有是否显示默认图标
  fallback?: boolean;
  icon?: Component | Function | string;
}>();

const isImageSrcIcon = computed(() => {
  // 兼容三类场景：
  // 1) http(s) 远程图片
  // 2) public/ 下的相对路径（例如 /assets/logo.webp 或 /base/assets/logo.webp）
  // 3) data url
  return (
    isString(props.icon) &&
    (isHttpUrl(props.icon) ||
      props.icon.startsWith('/') ||
      props.icon.startsWith('./') ||
      props.icon.startsWith('../') ||
      props.icon.startsWith('data:'))
  );
});

const isComponent = computed(() => {
  const { icon } = props;
  return !isString(icon) && (isObject(icon) || isFunction(icon));
});
</script>

<template>
  <component :is="icon as Component" v-if="isComponent" v-bind="$attrs" />
  <img v-else-if="isImageSrcIcon" :src="icon as string" v-bind="$attrs" />
  <IconifyIcon v-else-if="icon" v-bind="$attrs" :icon="icon as string" />
  <IconDefault v-else-if="fallback" v-bind="$attrs" />
</template>
