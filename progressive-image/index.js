export default (Vue, Opt = {}) => {
  // 封装splice方法，删除匹配到的第一个item（从左到右匹配）
  Array.prototype.remove = function (item) {
    if (!this.length) return
    const idx = this.indexOf(item)
    if (idx > -1) return this.splice(idx, 1)
  }
  // vue 版本
  const isVue2 = Vue.version.split('.')[0] == '2'
  // 触发事件
  const EVENTS = ['scroll', 'wheel', 'mousewheel', 'resize']
  // 工具函数
  const Util = {
    //
    getAnimationEvent () {
      const el = document.createElement('fake')
      const animations = {
        'animation': 'animationend',
        'OAnimation': 'oAnimationEnd',
        'MozAnimation': 'animationend',
        'WebkitAnimation': 'webkitAnimationEnd'
      }
      for (let a in animations) {
        if (el.style[a] !== undefined) {
          return animations[a]
        }
      }
    },
    throttle (action, delay) {
      let timeout = null
      let lastRun = 0
      return function () {
        if (timeout) {
          return
        }
        const elapsed = Date.now() - lastRun
        const context = this
        const args = arguments
        const runCallback = function () {
          lastRun = Date.now()
          timeout = false
          action.apply(context, args)
        }
        if (elapsed >= delay) {
          runCallback()
        } else {
          timeout = setTimeout(runCallback, delay)
        }
      }
    },
    on (el, ev, fn) {
      el.addEventListener(ev, fn)
    },
    off (el, ev, fn) {
      el.removeEventListener(ev, fn)
    }
  }

  // 绑定和卸载事件的封装 元素，事件，回调
  const events = (el, bind) => {
    if (bind) {
      EVENTS.forEach(evt => {
        Util.on(el, evt, lazy)
      })
    } else {
      EVENTS.forEach(evt => {
        Util.off(el, evt, lazy)
      })
    }
  }

  const animationEvent = Util.getAnimationEvent()

  /**
   * listeners 存的是尚未加载的图片
   * {
   *  el: ,
   *  src:
   * }
   *
   * imgCache存的是已经加载（下载完成）的图片
   */
  const Listeners = []
  const imgCache = []

  // 插件的状态
  const Options = {
    removePreview: Opt.removePreview || false,
    scale: Opt.scale || false,
    hasBind: false
  }

  // 滚动时   滚动鼠标时(mousewheel是已经被废弃的属性)  缩放窗口时
  // 'scroll', 'wheel', 'mousewheel', 'resize' 事件的回调，
  const lazy = Util.throttle(_ => {
    // 检查listeners是否渲染
    for (let i = 0, l = Listeners.length; i < l; i++) {
      checkImage(Listeners[i])
    }
  }, 300)

  const checkImage = listener => {
    // 已经加载过的图片（页面出现了多次相同src的图片，设置lazy=loaded属性，立即渲染）
    if (imgCache.indexOf(listener.src) > -1) {
      return render(listener.el, listener.src, 'loaded')
    // 未加载则加载图片
    } else {
      // 图片滚动到视口内的时候，加载真正的图片
      const rect = listener.el.getBoundingClientRect()
      if (rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0) {
        loadImage(listener)
      }
    }
  }

  // 检测元素是否已经加入listeners
  const isExist = el => {
    let exist = false
    Listeners.forEach(item => {
      if (item.el == el) exist = true
    })
    if (exist) {
      Vue.nextTick(() => {
        lazy()
      })
    }
    return exist
  }
  // 给vue提供的钩子
  const init = (el, binding, vnode) => {
    // 同一个元素不会绑定2次事件
    if (isExist(el)) return

    const src = binding.value
    if (imgCache.indexOf(src) > -1) {
      return render(el, src, 'loaded')
    }
    Vue.nextTick(_ => {
      // el不存在，就放到listeners数组中
      if (!isExist(el)) {
        Listeners.push({
          el: el,
          src: src
        })
      }
      // 初始化的时候执行一次，如果当前图片在视口内直接渲染
      lazy()
      // 如果hasBind为false且listeners未为空，则 给Events里的四个事件绑定lazy回调
      if (Listeners.length > 0 && !Options.hasBind) {
        Options.hasBind = true
        events(window, true)
      }
    })
  }

  const render = (el, src, status) => {
    el.setAttribute('lazy', status)
  }
  const loadImage = item => {
    const img = new Image()
    if (item.el.dataset) {
      item.el.dataset.srcset && (img.srcset = item.el.dataset.srcset)
      item.el.dataset.sizes && (img.sizes = item.el.dataset.sizes)
    }

    img.src = item.src
    img.className = 'origin'
    if (Options.scale) {
      img.className = 'origin-scale'
    }
    img.onload = _ => {
      // 出队列入队列
      Listeners.remove(item)
      imgCache.push(item.src)
      mountImage(item, img)
    }
    img.onerror = _ => {

    }
  }

  // 删除预览 渲染真正的图片 先显示预览图（超级模糊）,在隐藏的一瞬间缩放动画，然后显示真图，通过css动画实现
  const mountImage = (item, img) => {
    const preview = item.el
    const parent = preview.parentNode
    parent.appendChild(img).addEventListener(animationEvent, e => {
      preview.alt && (e.target.alt = preview.alt)
      preview.classList.add('hide')
      if (Options.removePreview) {
        parent.removeChild(preview)
        e.target.classList.remove('origin')
        e.target.classList.remove('origin-scale')
      }
    })
  }

  // 卸载， 卸载事件和状态，清空相应的数组，让gc回收内存
  const unbind = (el, binding, vnode, oldValue) => {
    if (!el) return
    if (Options.hasBind) {
      Options.hasBind = false
      events(window, false)
      Listeners.length = imgCache.length = 0
    }
  }

  if (isVue2) {
    Vue.directive('progressive', {
      bind: init,
      update: init,
      inserted: init,
      comppnentUpdated: lazy,
      unbind: unbind
    })
  } else {
    Vue.directive('progressive', {
      bind: lazy,
      update (newValue, oldValue) {
        init(this.el, {
          modifiers: this.modifiers,
          arg: this.arg,
          value: newValue,
          oldValue: oldValue
        })
      },
      unbind () {
        unbind(this.el)
      }
    })
  }
}
