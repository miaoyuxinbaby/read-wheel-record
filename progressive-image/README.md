# progressive-image

一个图片懒加载的vue插件

仓库地址(https://github.com/ccforward/progressive-image)

```html
<main id="app">
  <template v-for="item in imgs">
    <div class="space"></div>
    <div class="progressive">
      <img class="preview" v-progressive="item.src" :data-srcset="item.srcset" :src="item.preview" />
    </div>
  </template>
</main>
```

```js
import Vue from 'vue'
import progressive from 'progressive-image/dist/vue'

Vue.use(progressive, {
  removePreview: true,
  scale: true
})

new Vue({
  name: 'demo',
  el: '#app',
  data: {
    imgs: [
      {
        src: 'http://7xiblh.com1.z0.glb.clouddn.com/progressive/2.jpg',
        preview: 'http://7xiblh.com1.z0.glb.clouddn.com/progressive/r2.jpg'
      },
      {
        src: 'http://7xiblh.com1.z0.glb.clouddn.com/progressive/3.jpg',
        preview: 'http://7xiblh.com1.z0.glb.clouddn.com/progressive/r3.jpg'
      }
    ]
  }
})
```