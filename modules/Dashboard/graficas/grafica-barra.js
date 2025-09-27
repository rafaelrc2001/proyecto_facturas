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
                fontSize: 12
            },
            padding: [6, 10],
            formatter: function(params) {
              const data = params[0];
              return `
                <div style="font-weight: 600; margin-bottom: 3px; font-size: 12px;">${data.name}</div>
                <div style="display: flex; align-items: center; gap: 5px; font-size: 12px;">
                  <span style="display: inline-block; width: 8px; height: 8px; background: ${data.color}; border-radius: 50%;"></span>
                  Facturas: <strong>${data.value}</strong>
                </div>
              `;
            }
        },
       grid: {
    left: '8%',
    right: '4%',
    bottom: 60,   // Más espacio para etiquetas
    top: 40,
    containLabel: true // <-- Esto es clave
},
        xAxis: {
            type: 'category',
            data: fechas,
            axisLabel: {
                rotate: 30, // Inclina las etiquetas
                fontSize: 12,
                interval: 0, // Muestra todas las etiquetas
                color: '#455a64'
            }
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
        },
        options: {
          layout: {
            padding: {
              bottom: 30 // Espacio para las etiquetas
            }
          },
          plugins: {
            legend: { display: false }
          }
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

 //Auto-inicializar cuando el DOM esté listo
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

function initBarChart({ elementId, label, color }) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return null;
    const chart = echarts.init(chartDom);

    // Configuración base
    const baseOption = {
        backgroundColor: "transparent", // Fondo transparente
        title: { show: false },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderColor: '#254B62',
            borderWidth: 1,
            textStyle: {
                color: '#111827',
                fontSize: 12
            },
            padding: [6, 10],
            formatter: function(params) {
                const data = params[0];
                return `
                  <div style="font-weight: 600; margin-bottom: 3px; font-size: 12px;">${data.name}</div>
                  <div style="display: flex; align-items: center; gap: 5px; font-size: 12px;">
                    <span style="display: inline-block; width: 8px; height: 8px; background: ${data.color}; border-radius: 50%;"></span>
                    ${label}: <strong>${data.value}</strong>
                  </div>
                `;
            }
        },
       grid: {
    left: '8%',
    right: '4%',
    bottom: 60,   // Más espacio para etiquetas
    top: 40,
    containLabel: true // <-- Esto es clave
},
        xAxis: {
            type: 'value',
            name: 'Cantidad',
            nameTextStyle: {
                color: '#476D7C',
                fontSize: 10,
                fontWeight: 500,
                padding: [0, 0, 0, 20]
            },
            axisLabel: {
                show: false // Oculta los números del eje X
            },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: {
                lineStyle: {
                    color: '#f3f4f6',
                    width: 1,
                    type: 'solid'
                }
            },
            splitNumber: 4
        },
        yAxis: {
            type: 'category',
            data: [],
            axisLabel: {
                color: '#476D7C',
                fontSize: 10,
                fontWeight: 500,
                interval: 0,
                margin: 8
            },
            axisLine: {
                lineStyle: {
                    color: '#254B62',
                    width: 1
                }
            },
            axisTick: { show: false }
        },
        series: [{
            name: label,
            type: 'bar',
            data: [],
            itemStyle: {
                color: color
            },
            barWidth: '55%',
            label: {
                show: false // Oculta los números en las barras
            }
        }],
        animationEasing: 'elasticOut',
        animationDelay: function (idx) {
            return idx * 80;
        },
        animationDelayUpdate: function (idx) {
            return idx * 40;
        }
    };

    chart.setOption(baseOption);

    window.addEventListener('resize', function() {
        chart.resize();
    });

    // Función para actualizar datos
    function updateData({ categories, values }) {
        chart.setOption({
            yAxis: { data: categories },
            series: [{
                data: values.map((value) => ({
                    value: value,
                    itemStyle: {
                        color: color
                    }
                })),
                label: { show: false } // Oculta los números en las barras al actualizar
            }]
        });
    }

    return {
        chart,
        updateData,
        resize: () => chart.resize()
    };
}

// Inicialización global para ambas gráficas
window.facturasChartInstance = initBarChart({
    elementId: 'type-chart',
    label: 'Facturas',
    color: '#77ABB7' // --color-accent
});

window.ticketsChartInstance = initBarChart({
    elementId: 'tickets-dia-chart',
    label: 'Tickets',
    color: '#1D3E53' // --color-sidebar
});