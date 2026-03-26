// components/datetime-picker/datetime-picker.js
Component({
  properties: {
    value: {
      type: String,
      value: ''
    },
    title: {
      type: String,
      value: '选择日期时间'
    },
    minDate: {
      type: String,
      value: ''
    }
  },

  data: {
    showPicker: false,
    years: [],
    months: [],
    days: [],
    hours: [],
    minutes: [],
    pickerValue: [0, 0, 0, 0, 0]
  },

  lifetimes: {
    attached: function () {
      this.initPickerData();
    }
  },

  observers: {
    'value': function (val) {
      if (val) {
        this.setDateFromValue(val);
      }
    }
  },

  methods: {
    // 初始化选择器数据
    initPickerData: function () {
      const now = new Date();
      const currentYear = now.getFullYear();

      // 年份：当前年份到后5年
      const years = [];
      for (let i = currentYear; i <= currentYear + 5; i++) {
        years.push(i);
      }

      // 月份
      const months = [];
      for (let i = 1; i <= 12; i++) {
        months.push(i < 10 ? `0${i}` : `${i}`);
      }

      // 日期
      const days = this.getDaysInMonth(currentYear, 1);

      // 小时
      const hours = [];
      for (let i = 0; i <= 23; i++) {
        hours.push(i < 10 ? `0${i}` : `${i}`);
      }

      // 分钟
      const minutes = [];
      for (let i = 0; i <= 59; i++) {
        minutes.push(i < 10 ? `0${i}` : `${i}`);
      }

      this.setData({
        years,
        months,
        days,
        hours,
        minutes
      });

      // 设置默认值为当前时间
      if (!this.data.value) {
        const pickerValue = [
          0, // 当前年份
          now.getMonth(), // 当前月份
          now.getDate() - 1, // 当前日期
          now.getHours(), // 当前小时
          now.getMinutes() // 当前分钟
        ];
        this.setData({ pickerValue });
      }
    },

    // 根据年月获取天数
    getDaysInMonth: function (year, month) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const days = [];
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(i < 10 ? `0${i}` : `${i}`);
      }
      return days;
    },

    // 从值设置日期
    setDateFromValue: function (value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) return;

      const now = new Date();
      const currentYear = now.getFullYear();

      const yearIndex = this.data.years.indexOf(date.getFullYear());
      const monthIndex = date.getMonth();
      const dayIndex = date.getDate() - 1;
      const hourIndex = date.getHours();
      const minuteIndex = date.getMinutes();

      // 更新天数
      const days = this.getDaysInMonth(date.getFullYear(), date.getMonth() + 1);

      this.setData({
        days,
        pickerValue: [
          yearIndex >= 0 ? yearIndex : 0,
          monthIndex,
          dayIndex,
          hourIndex,
          minuteIndex
        ]
      });
    },

    // 显示选择器
    showPicker: function () {
      if (this.data.value) {
        this.setDateFromValue(this.data.value);
      }
      this.setData({ showPicker: true });
    },

    // 隐藏选择器
    hidePicker: function () {
      this.setData({ showPicker: false });
    },

    // 选择器滚动
    onPickerChange: function (e) {
      const value = e.detail.value;
      const oldPickerValue = this.data.pickerValue;

      // 如果年份或月份变化，更新天数
      if (value[0] !== oldPickerValue[0] || value[1] !== oldPickerValue[1]) {
        const year = this.data.years[value[0]];
        const month = parseInt(this.data.months[value[1]]);
        const days = this.getDaysInMonth(year, month);

        // 确保日期不超过当月天数
        const dayIndex = Math.min(value[2], days.length - 1);

        this.setData({
          days,
          pickerValue: [value[0], value[1], dayIndex, value[3], value[4]]
        });
      } else {
        this.setData({ pickerValue: value });
      }
    },

    // 确认选择
    confirmPicker: function () {
      const { years, months, days, hours, minutes, pickerValue } = this.data;

      const year = years[pickerValue[0]];
      const month = months[pickerValue[1]];
      const day = days[pickerValue[2]];
      const hour = hours[pickerValue[3]];
      const minute = minutes[pickerValue[4]];

      // 格式化为 ISO 字符串
      const dateStr = `${year}-${month}-${day}T${hour}:${minute}:00`;

      this.triggerEvent('change', {
        value: dateStr,
        displayValue: `${year}-${month}-${day} ${hour}:${minute}`
      });

      this.hidePicker();
    }
  }
});