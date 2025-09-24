
// Configuración de la gráfica de tipos
function initTypesChart() {
    const typesData = {
        categories: ['Trabajos en Caliente', 'Espacios Confinados', 'Trabajos en Altura', 'Eléctricos', 'Químicos'],
        values: [67, 34, 28, 21, 15],
        colors: ['#77ABB7', '#254B62', '#476D7C', '#d3dce4', '#111827'], // accent, primary, secondary, bg, text
        riskLevels: ['Alto', 'Alto', 'Medio', 'Medio', 'Bajo']
    };

    const typesChart = echarts.init(document.getElementById('type-chart'));

    const typesOption = {
        backgroundColor: "#ffffff", // --color-card-bg
        title: { show: false },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderColor: '#254B62', // --color-primary
            borderWidth: 1,
            textStyle: {
                color: '#111827', // --color-text
                fontSize: 11
            },
            padding: [5, 8]
        },
        grid: {
            left: '30%',
            right: '3%',
            bottom: '3%',
            top: '5%',
            containLabel: false
        },
        xAxis: {
            type: 'value',
            name: 'Cantidad',
            nameTextStyle: {
                color: '#476D7C', // --color-secondary
                fontSize: 10,
                fontWeight: 500,
                padding: [0, 0, 0, 20]
            },
            axisLabel: {
                color: '#476D7C', // --color-secondary
                fontSize: 10
            },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: {
                lineStyle: {
                    color: '#f3f4f6', // --color-table-header
                    width: 1,
                    type: 'solid'
                }
            },
            splitNumber: 4
        },
        yAxis: {
            type: 'category',
            data: typesData.categories,
            axisLabel: {
                color: '#476D7C', // --color-secondary
                fontSize: 10,
                fontWeight: 500,
                interval: 0,
                margin: 8
            },
            axisLine: {
                lineStyle: {
                    color: '#254B62', // --color-primary
                    width: 1
                }
            },
            axisTick: { show: false }
        },
        series: [{
            name: 'Permisos',
            type: 'bar',
            data: typesData.values.map((value, index) => ({
                value: value,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                        { offset: 0, color: typesData.colors[index % typesData.colors.length] },
                        { offset: 1, color: typesData.colors[index % typesData.colors.length] + '80' }
                    ]),
                    borderRadius: [0, 4, 4, 0],
                    shadowColor: typesData.colors[index % typesData.colors.length] + '30',
                    shadowBlur: 4,
                    shadowOffsetX: 2
                },
                emphasis: {
                    itemStyle: {
                        color: typesData.colors[index % typesData.colors.length],
                        shadowBlur: 6,
                        shadowOffsetX: 3
                    }
                },
                label: {
                    show: true,
                    position: 'right',
                    distance: 5,
                    formatter: '{c}',
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: '#111827' // --color-text
                }
            })),
            barWidth: '55%',
            animationDelay: function (idx) {
                return idx * 80;
            }
        }],
        animationEasing: 'elasticOut',
        animationDelayUpdate: function (idx) {
            return idx * 40;
        }
    };

    typesChart.setOption(typesOption);

    window.addEventListener('resize', function() {
        typesChart.resize();
    });

    // Función para actualizar datos
    function updateTypesChart(newData) {
        const updatedData = {
            categories: newData.categories || typesData.categories,
            values: newData.values || typesData.values,
            colors: newData.colors || typesData.colors,
            riskLevels: newData.riskLevels || typesData.riskLevels
        };

        const updatedOption = {
            yAxis: {
                data: updatedData.categories
            },
            series: [{
                data: updatedData.values.map((value, index) => ({
                    value: value,
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                            { offset: 0, color: updatedData.colors[index % updatedData.colors.length] },
                            { offset: 1, color: updatedData.colors[index % updatedData.colors.length] + '80' }
                        ]),
                        borderRadius: [0, 4, 4, 0],
                        shadowColor: updatedData.colors[index % updatedData.colors.length] + '30',
                        shadowBlur: 4,
                        shadowOffsetX: 2
                    },
                    label: {
                        show: true,
                        position: 'right',
                        distance: 5,
                        formatter: '{c}',
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: '#111827' // --color-text
                    }
                }))
            }]
        };
        typesChart.setOption(updatedOption);
    }

    // Función para obtener estadísticas de riesgo
    function getRiskStatistics() {
        const stats = {
            alto: 0,
            medio: 0,
            bajo: 0,
            total: typesData.values.reduce((a, b) => a + b, 0)
        };

        typesData.riskLevels.forEach((risk, index) => {
            const count = typesData.values[index];
            if (risk === 'Alto') stats.alto += count;
            else if (risk === 'Medio') stats.medio += count;
            else stats.bajo += count;
        });

        return stats;
    }

    return {
        chart: typesChart,
        updateData: updateTypesChart,
        resize: () => typesChart.resize(),
        getRiskStats: getRiskStatistics,
        data: typesData
    };
}

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  const chartDom = document.getElementById('type-chart');
  if (!chartDom) return;
  const chart = echarts.init(chartDom);

  window.typesChartInstance = {
    updateData: function({ categories, values, colors }) {
      chart.setOption({
        xAxis: { type: 'category', data: categories },
        yAxis: { type: 'value' },
        series: [{
          data: values,
          type: 'bar',
          itemStyle: { color: function(params) { return colors[params.dataIndex] || '#0284c7'; } }
        }]
      });
    }
  };
});

// Exportar para uso global1 initTypesChart;