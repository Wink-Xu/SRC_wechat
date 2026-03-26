// components/cover-adjuster/cover-adjuster.js
Component({
  properties: {
    outputWidth: { type: Number, value: 750 },
    outputHeight: { type: Number, value: 420 }
  },

  data: {
    show: false,
    imageSrc: '',
    viewWidth: 100,
    viewHeight: 100,
    areaWidth: 100,
    areaHeight: 100,
    x: 0,
    y: 0,
    cropTop: 0,
    cropWidth: 100,
    cropHeight: 100
  },

  methods: {
    show(imageSrc) {
      const that = this;

      wx.getSystemInfo({
        success(sys) {
          that.screenWidth = sys.windowWidth;
          that.screenHeight = sys.windowHeight;

          // 裁剪框 = 屏幕宽度减去边距
          that.cropWidth = sys.windowWidth - 40;
          that.cropHeight = that.cropWidth * 9 / 16;

          wx.getImageInfo({
            src: imageSrc,
            success(res) {
              that.originWidth = res.width;
              that.originHeight = res.height;

              // 图片显示尺寸：至少覆盖裁剪框
              const imgRatio = res.width / res.height;
              const cropRatio = that.cropWidth / that.cropHeight;

              let displayW, displayH;
              if (imgRatio > cropRatio) {
                displayH = that.cropHeight;
                displayW = displayH * imgRatio;
              } else {
                displayW = that.cropWidth;
                displayH = displayW / imgRatio;
              }

              // movable-area 大小 = 扩大移动范围
              const extraSpace = 300;
              const areaW = sys.windowWidth + extraSpace * 2;
              const areaH = sys.windowHeight + extraSpace * 2;

              // movable-area 从 (-extraSpace, -extraSpace) 开始
              // 所以图片位置需要加 extraSpace 来对齐到 adjuster-body
              that.areaOffsetX = extraSpace;
              that.areaOffsetY = extraSpace;

              // 裁剪框在 movable-area 坐标系中的位置
              // cropX = 20, cropY 要相对于 adjuster-body 计算
              // 但我们用 CSS 让裁剪框在 adjuster-body 中垂直居中
              // 所以 JS 这边也要用相同的计算
              that.cropX = 20;

              that.baseWidth = displayW;
              that.baseHeight = displayH;
              that.currentScale = 1;

              // 图片初始位置会在 bodyReady 回调中设置
              that.setData({
                show: true,
                imageSrc: imageSrc,
                viewWidth: displayW,
                viewHeight: displayH,
                areaWidth: areaW,
                areaHeight: areaH,
                cropWidth: that.cropWidth,
                cropHeight: that.cropHeight
              });

              // 延迟获取 adjuster-body 尺寸，计算裁剪框位置
              setTimeout(() => {
                that.createSelectorQuery()
                  .select('.adjuster-body')
                  .boundingClientRect(rect => {
                    if (rect) {
                      that.bodyHeight = rect.height;
                      that.bodyTop = rect.top; // adjuster-body 相对于屏幕的 top

                      // 裁剪框在 adjuster-body 中的位置（垂直居中）
                      that.cropY = (rect.height - that.cropHeight) / 2;
                      // 裁剪框相对于屏幕的 top
                      that.cropScreenY = rect.top + that.cropY;

                      // 图片初始位置：在裁剪框中居中
                      // movable-area 从 adjuster-body 的 (0,0) 开始
                      const initX = that.cropX + that.areaOffsetX + (that.cropWidth - displayW) / 2;
                      const initY = that.cropY + that.areaOffsetY + (that.cropHeight - displayH) / 2;

                      that.currentX = initX;
                      that.currentY = initY;

                      that.setData({
                        x: initX,
                        y: initY,
                        cropTop: that.cropY
                      });
                    }
                  })
                  .exec();
              }, 100);
            },
            fail(err) {
              console.error('获取图片信息失败', err);
              wx.showToast({ title: '图片加载失败', icon: 'none' });
            }
          });
        }
      });
    },

    onChange(e) {
      this.currentX = e.detail.x;
      this.currentY = e.detail.y;
    },

    onScale(e) {
      this.currentScale = e.detail.scale;
    },

    onCancel() {
      this.setData({ show: false });
      this.triggerEvent('cancel');
    },

    onConfirm() {
      const that = this;
      wx.showLoading({ title: '处理中...' });

      // 图片在 adjuster-body 坐标系中的位置
      const imgX = that.currentX - that.areaOffsetX;
      const imgY = that.currentY - that.areaOffsetY;

      // 图片相对于裁剪框的偏移
      const offsetX = imgX - that.cropX;
      const offsetY = imgY - that.cropY;

      // 缩放后的图片尺寸
      const scaledW = that.baseWidth * that.currentScale;
      const scaledH = that.baseHeight * that.currentScale;

      // 转换到原图坐标
      const displayRatio = that.baseWidth / that.originWidth;
      const srcX = -offsetX / that.currentScale / displayRatio;
      const srcY = -offsetY / that.currentScale / displayRatio;
      const srcW = that.cropWidth / that.currentScale / displayRatio;
      const srcH = that.cropHeight / that.currentScale / displayRatio;

      const canvas = wx.createOffscreenCanvas({
        type: '2d',
        width: that.data.outputWidth,
        height: that.data.outputHeight
      });
      const ctx = canvas.getContext('2d');

      const img = canvas.createImage();
      img.src = that.data.imageSrc;

      img.onload = () => {
        ctx.drawImage(
          img,
          srcX, srcY, srcW, srcH,
          0, 0, that.data.outputWidth, that.data.outputHeight
        );

        wx.canvasToTempFilePath({
          canvas,
          width: that.data.outputWidth,
          height: that.data.outputHeight,
          destWidth: that.data.outputWidth,
          destHeight: that.data.outputHeight,
          fileType: 'jpg',
          quality: 0.9,
          success(res) {
            wx.hideLoading();
            that.setData({ show: false });
            that.triggerEvent('confirm', { tempFilePath: res.tempFilePath });
          },
          fail(err) {
            wx.hideLoading();
            console.error('导出失败', err);
            wx.showToast({ title: '处理失败', icon: 'none' });
          }
        });
      };

      img.onerror = () => {
        wx.hideLoading();
        wx.showToast({ title: '处理失败', icon: 'none' });
      };
    }
  }
});