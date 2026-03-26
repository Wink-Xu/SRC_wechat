// pages/admin-activities/admin-activities.js
const { activityApi } = require('../../utils/request');
const { formatDate, showSuccess, showConfirm } = require('../../utils/util');
const { requireAdmin } = require('../../utils/auth');

Page({
  data: {
    activities: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    // 签到码弹窗
    showCheckInQr: false,
    checkInQrCode: '',
    checkInCount: 0,
    currentActivityId: ''
  },

  onLoad: function () {
    if (!requireAdmin()) {
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.loadActivities();
  },

  onPullDownRefresh: function () {
    this.refreshActivities().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMoreActivities();
    }
  },

  onUnload: function () {
    if (this._checkInTimer) {
      clearInterval(this._checkInTimer);
      this._checkInTimer = null;
    }
  },

  // 刷新活动列表
  refreshActivities: async function () {
    this.setData({
      page: 1,
      hasMore: true,
      activities: []
    });
    return this.loadActivities();
  },

  // 加载活动列表
  loadActivities: async function () {
    const { page, pageSize } = this.data;

    console.log('[AdminActivities] 开始加载活动，page:', page, 'pageSize:', pageSize);

    try {
      const result = await activityApi.getList({
        page,
        limit: pageSize,
        all: true // 获取所有状态的活动
      });

      console.log('[AdminActivities] API 返回结果:', result);

      // 收集需要转换的封面图 fileID
      const allActivities = result.list || [];
      const coverImageFileIDs = allActivities
        .filter(item => item.cover_image && item.cover_image.startsWith('cloud://'))
        .map(item => item.cover_image);

      // 批量转换 fileID 为临时 URL
      let tempUrlMap = {};
      if (coverImageFileIDs.length > 0) {
        try {
          const tempUrlResult = await wx.cloud.getTempFileURL({
            fileList: coverImageFileIDs
          });
          tempUrlResult.fileList.forEach(file => {
            tempUrlMap[file.fileID] = file.tempFileURL;
          });
        } catch (err) {
          console.error('获取封面临时链接失败', err);
        }
      }

      const activities = allActivities.map(item => {
        let coverImage = item.cover_image;
        if (item.cover_image && item.cover_image.startsWith('cloud://') && tempUrlMap[item.cover_image]) {
          coverImage = tempUrlMap[item.cover_image];
        }
        return {
          ...item,
          cover_image: coverImage,
          formattedTime: formatDate(item.start_time, 'MM-DD HH:mm'),
          statusText: this.getStatusText(item.status)
        };
      });

      console.log('[AdminActivities] 格式化后的活动数量:', activities.length);

      this.setData({
        activities: page === 1 ? activities : [...this.data.activities, ...activities],
        hasMore: activities.length >= pageSize,
        loading: false
      });

      console.log('[AdminActivities] setData 完成，当前活动数量:', this.data.activities.length);
    } catch (error) {
      console.error('加载活动列表失败', error);
      this.setData({ loading: false });
    }
  },

  // 加载更多
  loadMoreActivities: async function () {
    this.setData({
      loadingMore: true,
      page: this.data.page + 1
    });

    try {
      await this.loadActivities();
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  // 创建活动
  createActivity: function () {
    wx.navigateTo({
      url: '/pages/activity-create/activity-create'
    });
  },

  // 编辑活动
  editActivity: function (e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/activity-create/activity-create?id=${id}`
    });
  },

  // 发布活动
  publishActivity: async function (e) {
    const { id } = e.currentTarget.dataset;

    const confirm = await showConfirm('发布活动', '确定要发布此活动吗？发布后团员可以报名和签到。');
    if (!confirm) return;

    try {
      await activityApi.publish({ id });
      showSuccess('发布成功');
      this.refreshActivities();
    } catch (error) {
      console.error('发布失败', error);
    }
  },

  // 取消活动
  cancelActivity: async function (e) {
    const { id } = e.currentTarget.dataset;

    const confirm = await showConfirm('取消活动', '确定要取消此活动吗？');
    if (!confirm) return;

    try {
      await activityApi.cancel({ id });
      showSuccess('已取消');
      this.refreshActivities();
    } catch (error) {
      console.error('取消失败', error);
    }
  },

  // 结束活动（简化版 - 直接结束并发放积分）
  finishActivity: async function (e) {
    const { id } = e.currentTarget.dataset;

    const confirm = await showConfirm('结束活动', '活动结束后，系统将自动给已签到的团员发放积分。确认结束？');
    if (!confirm) return;

    wx.showLoading({ title: '结束中...' });

    try {
      const result = await activityApi.finishActivityWithCheckIn({ activityId: id });

      wx.hideLoading();

      console.log('[结束活动] 返回结果:', result);

      // 成功
      if (result && result.success) {
        showSuccess(`活动已结束，共发放 ${result.awarded_count || 0} 人 ${result.points_per_person || 0} 积分`);
        this.refreshActivities();
      } else {
        wx.showToast({
          title: '结束活动失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('结束活动失败', error);
      wx.showToast({
        title: error?.message || '结束活动失败',
        icon: 'none'
      });
    }
  },

  // 重启活动
  restartActivity: async function (e) {
    const { id } = e.currentTarget.dataset;

    const confirm = await showConfirm('重启活动', '重启将撤销已发放的积分，活动恢复为进行中状态。确认重启？');
    if (!confirm) return;

    wx.showLoading({ title: '重启中...' });

    try {
      const result = await activityApi.restartActivity({ activityId: id });

      wx.hideLoading();

      if (result && result.success) {
        showSuccess(`活动已重启，已撤销 ${result.revoked_count || 0} 人积分`);
        this.refreshActivities();
      } else {
        wx.showToast({
          title: '重启失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('重启活动失败', error);
      wx.showToast({
        title: error?.message || '重启失败',
        icon: 'none'
      });
    }
  },

  // 显示签到码
  showCheckInQrCode: async function (e) {
    const { id } = e.currentTarget.dataset;

    try {
      const result = await activityApi.getCheckInQrCode({ id });
      this.setData({
        currentActivityId: id,
        checkInQrCode: result.qr_code,
        checkInCount: result.check_in_count || 0,
        showCheckInQr: true
      });

      // 启动定时刷新签到人数（每5秒）
      this._checkInTimer = setInterval(() => {
        this.refreshCheckInCount(id);
      }, 5000);
    } catch (error) {
      console.error('获取签到码失败', error);
      wx.showToast({
        title: '获取签到码失败',
        icon: 'none'
      });
    }
  },

  // 刷新签到人数
  refreshCheckInCount: async function (activityId) {
    try {
      const result = await activityApi.getCheckInQrCode({ id: activityId });
      this.setData({ checkInCount: result.check_in_count || 0 });
    } catch (error) {
      console.error('刷新签到人数失败', error);
    }
  },

  // 关闭签到码弹窗
  closeCheckInQrCode: function () {
    // 清除定时器
    if (this._checkInTimer) {
      clearInterval(this._checkInTimer);
      this._checkInTimer = null;
    }
    this.setData({
      showCheckInQr: false
    });
  },

  // 保存二维码图片
  saveQrCode: function () {
    const that = this;
    wx.showLoading({ title: '保存中...' });

    wx.downloadFile({
      url: this.data.checkInQrCode,
      success: function (res) {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: function () {
            wx.hideLoading();
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            });
          },
          fail: function (err) {
            wx.hideLoading();
            if (err.errMsg.includes('auth deny')) {
              wx.showModal({
                title: '提示',
                content: '您已拒绝相册权限，请在设置中开启',
                confirmText: '去设置',
                success: function (modalRes) {
                  if (modalRes.confirm) {
                    wx.openSetting();
                  }
                }
              });
            } else {
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              });
            }
          }
        });
      },
      fail: function (err) {
        wx.hideLoading();
        wx.showToast({
          title: '下载图片失败',
          icon: 'none'
        });
        console.error('下载图片失败', err);
      }
    });
  },

  // 删除活动
  deleteActivity: function (e) {
    const { id } = e.currentTarget.dataset;
    const self = this;

    // 第一次确认
    wx.showModal({
      title: '警告',
      content: '确定要删除此活动吗？删除后无法恢复！',
      confirmText: '继续',
      confirmColor: '#f44336',
      success: function (res) {
        if (res.confirm) {
          // 第二次确认
          wx.showModal({
            title: '再次确认',
            content: '此操作不可逆，确定要删除吗？',
            confirmText: '确定删除',
            confirmColor: '#f44336',
            success: function (res2) {
              if (res2.confirm) {
                // 调用删除 API
                activityApi.delete({ id }).then(() => {
                  wx.showToast({
                    title: '删除成功',
                    icon: 'success'
                  });
                  self.refreshActivities();
                }).catch((error) => {
                  console.error('删除失败', error);
                  wx.showToast({
                    title: '删除失败',
                    icon: 'none'
                  });
                });
              }
            }
          });
        }
      }
    });
  },

  // 获取状态文本
  getStatusText: function (status) {
    const statusMap = {
      draft: '草稿',
      ongoing: '进行中',
      ended: '已结束',
      cancelled: '已取消'
    };
    return statusMap[status] || status;
  }
});