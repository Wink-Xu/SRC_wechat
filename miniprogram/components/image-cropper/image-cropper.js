// components/image-cropper/image-cropper.js
Component({
  properties: {
    // 输出图片宽度
    outputWidth: {
      type: Number,
      value: 750
    },
    // 输出图片高度
    outputHeight: {
      type: Number,
      value: 420
    }
  },

  data: {
    show: false,
    imageSrc: '',
    imageWidth: 0,      // 图片显示宽度
    imageHeight: 0,     // 图片显示高度
    cropX: 0,           // 裁剪框位置
    cropY: 0,
    cropWidth: 0,       // 裁剪框大小
    cropHeight: 0,
    containerWidth: 0,
    containerHeight: 0
  },

  lifetimes: {
    attached() {
      const systemInfo = wx.getSystemInfoSync();
      this.windowWidth = systemInfo.windowWidth;
      this.windowHeight = systemInfo.windowHeight;
    }
  },

  methods: {
    // 显示裁剪器
    showCropper(imageSrc) {
      this.setData({ imageSrc });

      wx.getImageInfo({
        src: imageSrc,
        success: (info) => {
          // 保存原始图片尺寸
          this.realImageWidth = info.width;
          this.realImageHeight = info.height;

          const imgRatio = info.width / info.height;

          // 图片显示区域（占屏幕宽度95%，高度自适应）
          const containerWidth = this.windowWidth * 0.95;
          let imageWidth, imageHeight;

          if (imgRatio > containerWidth / (this.windowHeight * 0.6)) {
            imageWidth = containerWidth;
            imageHeight = containerWidth / imgRatio;
          } else {
            imageHeight = this.windowHeight * 0.6;
            imageWidth = imageHeight * imgRatio;
          }

          // 初始裁剪框（默认居中，占图片80%）
          const cropWidth = imageWidth * 0.8;
          const cropHeight = imageHeight * 0.8;
          const cropX = (imageWidth - cropWidth) / 2;
          const cropY = (imageHeight - cropHeight) / 2;

          this.setData({
            show: true,
            imageWidth,
            imageHeight,
            containerWidth: imageWidth,
            containerHeight: imageHeight,
            cropX,
            cropY,
            cropWidth,
            cropHeight
          });
        }
      });
    },

    // 触摸开始
    onTouchStart(e) {
      const touch = e.touches[0];
      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.startCropX = this.data.cropX;
      this.startCropY = this.data.cropY;
      this.startCropWidth = this.data.cropWidth;
      this.startCropHeight = this.data.cropHeight;

      // 判断触摸位置
      const { cropX, cropY, cropWidth, cropHeight } = this.data;
      const x = touch.clientX - (this.windowWidth - this.data.imageWidth) / 2;
      const y = touch.clientY - 100; // 粗略估计顶部偏移

      // 判断是否在调整大小的区域（右下角）
      const resizeArea = 40;
      if (x > cropX + cropWidth - resizeArea && x < cropX + cropWidth + resizeArea &&
          y > cropY + cropHeight - resizeArea && y < cropY + cropHeight + resizeArea) {
        this.action = 'resize';
      } else if (x >= cropX && x <= cropX + cropWidth && y >= cropY && y <= cropY + cropHeight) {
        this.action = 'move';
      } else {
        this.action = null;
      }
    },

    // 触摸移动
    onTouchMove(e) {
      if (!this.action) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - this.startX;
      const deltaY = touch.clientY - this.startY;

      if (this.action === 'move') {
        // 移动裁剪框
        let newX = this.startCropX + deltaX;
        let newY = this.startCropY + deltaY;

        // 边界限制
        newX = Math.max(0, Math.min(this.data.imageWidth - this.data.cropWidth, newX));
        newY = Math.max(0, Math.min(this.data.imageHeight - this.data.cropHeight, newY));

        this.setData({ cropX: newX, cropY: newY });

      } else if (this.action === 'resize') {
        // 调整裁剪框大小
        let newWidth = this.startCropWidth + deltaX;
        let newHeight = this.startCropHeight + deltaY;

        // 最小尺寸
        const minSize = 50;
        newWidth = Math.max(minSize, newWidth);
        newHeight = Math.max(minSize, newHeight);

        // 不能超出图片
        newWidth = Math.min(this.data.imageWidth - this.data.cropX, newWidth);
        newHeight = Math.min(this.data.imageHeight - this.data.cropY, newHeight);

        this.setData({ cropWidth: newWidth, cropHeight: newHeight });
      }
    },

    // 触摸结束
    onTouchEnd(e) {
      this.action = null;
    },

    // 取消
    onCancel() {
      this.setData({ show: false });
      this.triggerEvent('cancel');
    },

    // 确认裁剪
    onConfirm() {
      wx.showLoading({ title: '处理中...' });

      // 计算原始图片上的裁剪区域
      const scaleX = this.realImageWidth / this.data.imageWidth;
      const scaleY = this.realImageHeight / this.data.imageHeight;

      const srcX = this.data.cropX * scaleX;
      const srcY = this.data.cropY * scaleY;
      const srcWidth = this.data.cropWidth * scaleX;
      const srcHeight = this.data.cropHeight * scaleY;

      console.log('裁剪参数:', {
        srcX, srcY, srcWidth, srcHeight,
        outputWidth: this.data.outputWidth,
        outputHeight: this.data.outputHeight
      });

      // 创建离屏 canvas
      const canvas = wx.createOffscreenCanvas({
        type: '2d',
        width: this.data.outputWidth,
        height: this.data.outputHeight
      });
      const ctx = canvas.getContext('2d');

      const img = canvas.createImage();
      img.src = this.data.imageSrc;

      img.onload = () => {
        // 绘制裁剪后的图片并缩放到目标尺寸
        ctx.drawImage(
          img,
          srcX,
          srcY,
          srcWidth,
          srcHeight,
          0,
          0,
          this.data.outputWidth,
          this.data.outputHeight
        );

        wx.canvasToTempFilePath({
          canvas,
          x: 0,
          y: 0,
          width: this.data.outputWidth,
          height: this.data.outputHeight,
          destWidth: this.data.outputWidth,
          destHeight: this.data.outputHeight,
          fileType: 'jpg',
          quality: 0.9,
          success: (res) => {
            wx.hideLoading();
            this.setData({ show: false });
            this.triggerEvent('confirm', { tempFilePath: res.tempFilePath });
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('裁剪失败', err);
            wx.showToast({ title: '裁剪失败', icon: 'none' });
          }
        });
      };

      img.onerror = (err) => {
        wx.hideLoading();
        console.error('图片加载失败', err);
        wx.showToast({ title: '图片加载失败', icon: 'none' });
      };
    }
  }
});