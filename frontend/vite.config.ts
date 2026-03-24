import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';

import { defineConfig, loadEnv } from 'vite';

import { createViteProxy, getBuildTime } from './build/config';
import { setupVitePlugins } from './build/plugins';

/** Vendor chunk configuration for bundle splitting */
const VENDOR_CHUNKS: Array<{ modules: string[]; name: string }> = [
  { modules: ['react/', 'react-dom/', 'scheduler/'], name: 'react-core' },
  { modules: ['react-router-dom/', '@tanstack/'], name: 'react-ecosystem' },
  { modules: ['antd/', '@ant-design/', 'rc-'], name: 'antd' },
  { modules: ['echarts/', 'zrender/'], name: 'echarts' },
  { modules: ['motion/'], name: 'animation' },
  { modules: ['lodash-es/', 'lodash/'], name: 'lodash' },
  { modules: ['dayjs/'], name: 'dayjs' },
  { modules: ['i18next/', 'react-i18next/'], name: 'i18n' },
  { modules: ['zustand/'], name: 'zustand' },
  { modules: ['@reduxjs/', 'react-redux/'], name: 'redux' },
  { modules: ['@sa/'], name: 'sa-utils' }
];

// https://vitejs.dev/config/
export default defineConfig(configEnv => {
  const viteEnv = loadEnv(configEnv.mode, process.cwd()) as unknown as Env.ImportMeta;

  const buildTime = getBuildTime();

  const enableProxy = configEnv.command === 'serve' && !configEnv.isPreview;
  return {
    base: viteEnv.VITE_BASE_URL,
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'antd',
        '@ant-design/icons',
        'dayjs',
        'dayjs/locale/zh-cn',
        'axios',
        '@tanstack/react-query',
        'zustand',
        'lodash-es',
        'clsx',
        'tailwind-merge'
      ],
      exclude: [],
      force: false
    },
    build: {
      rollupOptions: {
        output: {
          assetFileNames: chunkInfo => {
            const name = chunkInfo.names[0];

            if (name?.endsWith('.css')) {
              return 'css/[name]-[hash].css';
            }

            const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];

            if (imgExts.some(ext => name?.endsWith(`.${ext}`))) {
              return 'images/[name]-[hash].[ext]';
            }

            if (name?.endsWith('.js')) {
              return 'js/[name]-[hash].js';
            }

            return 'assets/[name]-[hash].[ext]';
          },
          chunkFileNames: chunkInfo => {
            // 检查文件路径，如果是 pages 目录下的文件，则修改文件名和路径
            const filePath = chunkInfo.facadeModuleId;

            if (filePath) {
              // 提取文件的父文件夹作为文件名
              if (filePath.includes('/src/pages/')) {
                // 提取文件的父文件夹作为文件名
                const pageName = filePath.split('/src/pages/')[1];
                // 替换 [name] 为  name 因为vite不支持
                const newPath = pageName.replace(/\[([^\]]+)\]/g, '$1');

                const path = newPath.slice(0, newPath.lastIndexOf('/'));

                return `js/pages/${path}/[name]-[hash].js`;
              } else if (filePath.includes('/src/components/')) {
                return `js/components/[name]-[hash].js`;
              }
            }

            return 'js/[name]-[hash].js'; // 默认处理方式
          },
          manualChunks: (id) => {
            for (const { modules, name } of VENDOR_CHUNKS) {
              if (modules.some(m => id.includes(`node_modules/${m}`))) {
                return name;
              }
            }
            if (id.includes('node_modules/')) {
              return 'vendor';
            }
          }
        }
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/scss/global.scss" as *;`,
          api: 'modern-compiler'
        }
      }
    },
    define: {
      BUILD_TIME: JSON.stringify(buildTime)
    },
    plugins: setupVitePlugins(viteEnv, buildTime),
    preview: {
      port: 9725
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '~': fileURLToPath(new URL('./', import.meta.url))
      }
    },
    server: {
      host: '0.0.0.0',
      open: true,
      port: 9527,
      proxy: createViteProxy(viteEnv, enableProxy),
      warmup: {
        clientFiles: [
          './index.html',
          './src/main.tsx',
          './src/App.tsx',
          './src/store/index.ts',
          './src/plugins/**/*.ts',
          './src/features/router/**/*.tsx',
          './src/pages/(base)/**/*.tsx'
        ]
      }
    }
  };
});
