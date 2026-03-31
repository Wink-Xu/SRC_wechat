# 咖啡商品初始数据

在微信开发者工具的云开发控制台中，创建 `coffee_products` 集合，然后手动添加以下商品数据。

## 商品数据

### 美式分类 (americano)

```json
{
  "name": "美式",
  "category": "americano",
  "price": 1600,
  "points_price": 16,
  "temperature": "both",
  "is_available": true,
  "sort_order": 1
}
```

```json
{
  "name": "葡萄气泡美式",
  "category": "americano",
  "price": 1800,
  "points_price": 18,
  "temperature": "cold_only",
  "is_available": true,
  "sort_order": 2
}
```

```json
{
  "name": "菠萝气泡美式",
  "category": "americano",
  "price": 1800,
  "points_price": 18,
  "temperature": "cold_only",
  "is_available": true,
  "sort_order": 3
}
```

### 拿铁分类 (latte)

```json
{
  "name": "拿铁",
  "category": "latte",
  "price": 2600,
  "points_price": 26,
  "temperature": "both",
  "is_available": true,
  "sort_order": 10
}
```

```json
{
  "name": "生椰拿铁",
  "category": "latte",
  "price": 2800,
  "points_price": 28,
  "temperature": "both",
  "is_available": true,
  "sort_order": 11
}
```

```json
{
  "name": "香草拿铁",
  "category": "latte",
  "price": 2800,
  "points_price": 28,
  "temperature": "both",
  "is_available": true,
  "sort_order": 12
}
```

```json
{
  "name": "西班牙拿铁",
  "category": "latte",
  "price": 2800,
  "points_price": 28,
  "temperature": "both",
  "is_available": true,
  "sort_order": 13
}
```

```json
{
  "name": "焦糖拿铁",
  "category": "latte",
  "price": 2800,
  "points_price": 28,
  "temperature": "both",
  "is_available": true,
  "sort_order": 14
}
```

```json
{
  "name": "话梅拿铁",
  "category": "latte",
  "price": 2800,
  "points_price": 28,
  "temperature": "both",
  "is_available": true,
  "sort_order": 15
}
```

### 特调分类 (special)

```json
{
  "name": "橘皮拿铁",
  "category": "special",
  "price": 3000,
  "points_price": 30,
  "temperature": "cold_only",
  "is_available": true,
  "sort_order": 20
}
```

```json
{
  "name": "开心果拿铁",
  "category": "special",
  "price": 3000,
  "points_price": 30,
  "temperature": "cold_only",
  "is_available": true,
  "sort_order": 21
}
```

```json
{
  "name": "黑芝麻拿铁",
  "category": "special",
  "price": 3000,
  "points_price": 30,
  "temperature": "cold_only",
  "is_available": true,
  "sort_order": 22
}
```

```json
{
  "name": "路易波士鸳鸯拿铁",
  "category": "special",
  "price": 3000,
  "points_price": 30,
  "temperature": "cold_only",
  "is_available": true,
  "sort_order": 23
}
```

```json
{
  "name": "曼谷咖啡拿铁",
  "category": "special",
  "price": 3000,
  "points_price": 30,
  "temperature": "cold_only",
  "is_available": true,
  "sort_order": 24
}
```

### 无咖啡因分类 (decaf)

```json
{
  "name": "抹茶拿铁",
  "category": "decaf",
  "price": 2600,
  "points_price": 26,
  "temperature": "both",
  "is_available": true,
  "sort_order": 30
}
```

```json
{
  "name": "路易波士茶拿铁",
  "category": "decaf",
  "price": 2600,
  "points_price": 26,
  "temperature": "both",
  "is_available": true,
  "sort_order": 31
}
```

```json
{
  "name": "姜黄拿铁",
  "category": "decaf",
  "price": 2600,
  "points_price": 26,
  "temperature": "both",
  "is_available": true,
  "sort_order": 32
}
```

### 单品手冲分类 (pour_over)

```json
{
  "name": "单品手冲",
  "category": "pour_over",
  "price": 3500,
  "points_price": 35,
  "temperature": "hot_only",
  "is_available": true,
  "sort_order": 40
}
```

### 充值套餐分类 (recharge)

```json
{
  "name": "美式套餐 ×10杯",
  "category": "recharge",
  "price": 13800,
  "points_price": 138,
  "temperature": "both",
  "is_available": true,
  "sort_order": 50,
  "is_recharge": true,
  "recharge_type": "americano",
  "recharge_count": 10
}
```

```json
{
  "name": "任意套餐 ×10杯",
  "category": "recharge",
  "price": 21800,
  "points_price": 218,
  "temperature": "both",
  "is_available": true,
  "sort_order": 51,
  "is_recharge": true,
  "recharge_type": "any",
  "recharge_count": 10
}
```

## 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 商品名称 |
| category | string | 分类：americano/latte/special/decaf/pour_over/recharge |
| price | number | 价格（单位：分）|
| points_price | number | 积分价格（可选，null 表示不支持积分）|
| temperature | string | 温度选项：both/cold_only/hot_only |
| is_available | boolean | 是否上架 |
| sort_order | number | 排序权重（越小越靠前）|
| is_recharge | boolean | 是否为充值套餐 |
| recharge_type | string | 套餐类型：americano/any |
| recharge_count | number | 套餐包含杯数 |