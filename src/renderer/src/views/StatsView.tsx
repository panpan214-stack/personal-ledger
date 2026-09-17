import { useEffect, useMemo, useState } from 'react'
import { Card, Col, Empty, Row, Statistic, Table } from 'antd'
import type { TableColumnsType } from 'antd'
import type { EChartsOption } from 'echarts'
import EChart from '../components/EChart'
import type { Category, CategoryStat, MonthStat, StatsData } from '../../../shared/types'
import { errMsg } from '../utils/errMsg'

// 图表配色(2026-09-17 经 dataviz 色觉安全校验脚本验证通过,浅色表面 #ffffff)
const CATEGORY_COLORS = [
  '#2a78d6', // 1 蓝
  '#eb6834', // 2 橙
  '#1baf7a', // 3 青
  '#eda100', // 4 黄
  '#e87ba4', // 5 品红
  '#008300', // 6 绿
  '#4a3aa7', // 7 紫
  '#e34948' // 8 红
]
const OTHER_COLOR = '#e1e0d9' // 「其他」用中性浅灰,表示"不属于任何主色"
const MUTED_INK = '#898781' // 坐标轴文字
const GRID_LINE = '#e1e0d9' // 网格线(极浅)
const BASELINE = '#c3c2b7' // 轴线
const PIE_MAX_NAMED = 5 // 饼图最多 5 个具名扇区 + 「其他」(≤6 片的规范)

const toYuan = (cents: number): number => Number((cents / 100).toFixed(2))

function StatsView(): JSX.Element {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    window.api.getStats().then(setStats).catch((err) => console.error('统计加载失败', errMsg(err)))
    window.api
      .listCategories()
      .then(setCategories)
      .catch((err) => console.error('分类加载失败', errMsg(err)))
  }, [])

  // 颜色跟随实体而非排名:按一级分类固定顺序占用色槽,第 9 个起归入「其他」(规范:永不循环用色)
  const colorByCategoryId = useMemo(() => {
    const map = new Map<number, string>()
    categories
      .filter((c) => c.level === 1)
      .forEach((c, i) => {
        if (i < CATEGORY_COLORS.length) map.set(c.id, CATEGORY_COLORS[i])
      })
    return map
  }, [categories])

  // 饼图数据:前 5 个具名扇区 + 其余(含无颜色槽位的分类)合并为「其他」
  const pieData = useMemo(() => {
    if (!stats || stats.totalCents === 0) return null
    const named = stats.byCategory.filter((c) => colorByCategoryId.has(c.categoryId))
    const slices = named.slice(0, PIE_MAX_NAMED).map((c) => ({
      name: c.name,
      value: toYuan(c.totalCents),
      itemStyle: { color: colorByCategoryId.get(c.categoryId), borderColor: '#ffffff' }
    }))
    const restCents = stats.byCategory
      .filter((c) => !colorByCategoryId.has(c.categoryId) || !named.slice(0, PIE_MAX_NAMED).includes(c))
      .reduce((sum, c) => sum + c.totalCents, 0)
    if (restCents > 0) {
      slices.push({
        name: '其他',
        value: toYuan(restCents),
        itemStyle: { color: OTHER_COLOR, borderColor: BASELINE }
      })
    }
    return slices
  }, [stats, colorByCategoryId])

  const pieOption: EChartsOption | null = useMemo(() => {
    if (!pieData) return null
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}:¥ {c}({d}%)'
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: MUTED_INK }
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '44%'],
          data: pieData,
          // 2px 表面间隙(白色描边分隔扇区)
          itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
          label: { show: false }, // 标识由图例 + tooltip + 表格承担,不逐片标数字
          emphasis: { label: { show: false } }
        }
      ]
    }
  }, [pieData])

  const trendOption: EChartsOption | null = useMemo(() => {
    if (!stats) return null
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: '{b}<br/>支出:¥ {c}'
      },
      grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: stats.trend.map((t) => t.month),
        axisLine: { lineStyle: { color: BASELINE } },
        axisTick: { show: false },
        axisLabel: { color: MUTED_INK, fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: GRID_LINE } },
        axisLabel: { color: MUTED_INK, formatter: '¥ {value}' }
      },
      series: [
        {
          name: '支出',
          type: 'bar',
          data: stats.trend.map((t) => toYuan(t.totalCents)),
          // 单一序列用 1 号色;细柱、4px 圆角收尾
          itemStyle: { color: CATEGORY_COLORS[0], borderRadius: [4, 4, 0, 0] },
          barWidth: '40%'
        }
      ]
    }
  }, [stats])

  // 分类明细表格(饼图的表格视图,兼顾可访问性)
  const categoryColumns: TableColumnsType<CategoryStat> = [
    {
      title: '分类',
      dataIndex: 'name',
      render: (_v, r) => (
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              marginRight: 8,
              background: colorByCategoryId.get(r.categoryId) ?? OTHER_COLOR
            }}
          />
          {r.name}
        </span>
      )
    },
    {
      title: '金额(元)',
      dataIndex: 'totalCents',
      align: 'right',
      render: (v: number) => `¥ ${toYuan(v).toFixed(2)}`
    },
    {
      title: '占比',
      key: 'percent',
      align: 'right',
      render: (_v, r) =>
        stats && stats.totalCents > 0 ? `${((r.totalCents / stats.totalCents) * 100).toFixed(1)}%` : '-'
    }
  ]

  // 月度明细表格(趋势图的表格视图,最新在前)
  const monthColumns: TableColumnsType<MonthStat> = [
    { title: '月份', dataIndex: 'month' },
    {
      title: '支出(元)',
      dataIndex: 'totalCents',
      align: 'right',
      render: (v: number) => `¥ ${toYuan(v).toFixed(2)}`
    }
  ]

  if (!stats) return <Card title="统计图表" loading />

  const hasData = stats.count > 0
  const monthTableData = [...stats.trend].reverse()

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title={`本月总支出(${stats.month})`}
              value={toYuan(stats.totalCents)}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="记账笔数" value={stats.count} suffix="笔" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="日均支出"
              value={toYuan(stats.dailyAvgCents)}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Card title={`分类占比(${stats.month})`} style={{ marginBottom: 16 }}>
            {hasData && pieOption ? (
              <EChart option={pieOption} height={300} />
            ) : (
              <Empty description="本月还没有记账" />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="分类明细" style={{ marginBottom: 16 }}>
            {hasData ? (
              <Table
                rowKey="categoryId"
                columns={categoryColumns}
                dataSource={stats.byCategory}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="本月还没有记账" />
            )}
          </Card>
        </Col>
        <Col span={14}>
          <Card title="近 6 个月支出趋势" style={{ marginBottom: 16 }}>
            {hasData && trendOption ? (
              <EChart option={trendOption} height={300} />
            ) : (
              <Empty description="本月还没有记账" />
            )}
          </Card>
        </Col>
        <Col span={10}>
          <Card title="月度明细" style={{ marginBottom: 16 }}>
            {hasData ? (
              <Table
                rowKey="month"
                columns={monthColumns}
                dataSource={monthTableData}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="本月还没有记账" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default StatsView
