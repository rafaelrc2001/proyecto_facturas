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

// Mantén solo las funciones que realmente usas con datos reales:
// actualizarGraficaEstablecimientosTipo(registros)
// actualizarGraficaEstablecimientosGradiente(registros)
// createSoftTextureBarra()

// Así solo se mostrará la gráfica dinámica y elegante con tus datos.

function actualizarGraficaEstablecimientosTipo(registros) {
  const TIENDA_INDEX = 4; // Columna de establecimiento
  const TIPO_INDEX = 2;   // Columna de tipo (ticket/factura)

  // Conteo por establecimiento y tipo
  const conteo = {};
  registros.forEach(fila => {
    const tienda = (fila[TIENDA_INDEX] || '').trim();
    const tipo = (fila[TIPO_INDEX] || '').trim().toLowerCase();
    if (!tienda || !tipo) return;
    if (!conteo[tienda]) conteo[tienda] = { ticket: 0, factura: 0 };
    if (tipo === 'ticket') conteo[tienda].ticket++;
    else if (tipo === 'factura') conteo[tienda].factura++;
  });

  // Ordena por suma total descendente
  const establecimientos = Object.keys(conteo)
    .map(nombre => ({
      nombre,
      total: conteo[nombre].ticket + conteo[nombre].factura,
      ticket: conteo[nombre].ticket,
      factura: conteo[nombre].factura
    }))
    .sort((a, b) => b.total - a.total);

  const categorias = establecimientos.map(e => e.nombre);
  const tickets = establecimientos.map(e => e.ticket);
  const facturas = establecimientos.map(e => e.factura);

  const chartDom = document.getElementById('establecimientos-chart');
  if (!chartDom) return;
  const chart = echarts.init(chartDom);

  chart.setOption({
    backgroundColor: {
      type: 'pattern',
      image: createSoftTextureBarra(),
      repeat: 'repeat'
    },
    grid: {
      left: '4%',
      right: '8%',
      top: 40,
      bottom: 20,
      containLabel: true
    },
    title: {
      text: '',
      left: 'center',
      top: 10
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#B0BEC5',
      borderWidth: 1,
      textStyle: { color: '#003B5C', fontWeight: 'normal', fontSize: 13 },
      formatter: params => {
        let txt = `<strong>${params[0].name}</strong><br>`;
        params.forEach(p => {
          txt += `<span style="display:inline-block;margin-right:6px;width:10px;height:10px;background:${p.color};border-radius:2px;"></span>
            ${p.seriesName}: <strong>${p.value}</strong><br>`;
        });
        return txt;
      }
    },
    legend: {
      data: ['Tickets', 'Facturas'],
      top: 8,
      left: 'center',
      itemWidth: 18,
      itemHeight: 10,
      icon: 'rect',
      textStyle: {
        color: '#003B5C',
        fontWeight: 500,
        fontSize: 15
      }
    },
    xAxis: {
      type: 'value',
      show: false
    },
    yAxis: {
      type: 'category',
      data: categorias,
      axisLabel: {
        color: '#003B5C',
        fontSize: 14,
        fontWeight: 600,
        padding: [0, 0, 0, 4]
      },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        name: 'Tickets',
        type: 'bar',
        stack: 'total',
        data: tickets,
        barWidth: 22,
        itemStyle: {
          color: '#FF6F00', // naranja-seguridad
          borderRadius: [6, 6, 6, 6],
          shadowBlur: 8,
          shadowColor: 'rgba(255,111,0,0.10)'
        },
        label: {
          show: true,
          position: 'right',
          fontSize: 13,
          color: '#FF6F00',
          fontWeight: 600,
          formatter: v => v.value > 0 ? v.value : ''
        },
        emphasis: {
          focus: 'series'
        },
        animationDelay: idx => idx * 120
      },
      {
        name: 'Facturas',
        type: 'bar',
        stack: 'total',
        data: facturas,
        barWidth: 22,
        itemStyle: {
          color: '#003B5C', // azul-petroleo
          borderRadius: [6, 6, 6, 6],
          shadowBlur: 8,
          shadowColor: 'rgba(0,59,92,0.10)'
        },
        label: {
          show: true,
          position: 'right',
          fontSize: 13,
          color: '#003B5C',
          fontWeight: 600,
          formatter: v => v.value > 0 ? v.value : ''
        },
        emphasis: {
          focus: 'series'
        },
        animationDelay: idx => idx * 120 + 60
      }
    ],
    animationEasing: 'elasticOut',
    animationDuration: 900
  });

  window.addEventListener('resize', function() {
    chart.resize();
  });
}

function actualizarGraficaEstablecimientosGradiente(registros) {
  const TIENDA_INDEX = 4; // Columna de establecimiento

  // Conteo por establecimiento
  const conteo = {};
  registros.forEach(fila => {
    const tienda = (fila[TIENDA_INDEX] || '').trim();
    if (!tienda) return;
    conteo[tienda] = (conteo[tienda] || 0) + 1;
  });

  // Ordena por cantidad descendente
  const establecimientos = Object.keys(conteo)
    .map(nombre => ({
      nombre,
      cantidad: conteo[nombre]
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const categorias = establecimientos.map(e => e.nombre);
  const valores = establecimientos.map(e => e.cantidad);

  const chartDom = document.getElementById('establecimientos-chart');
  if (!chartDom) return;
  const chart = echarts.init(chartDom);

  chart.setOption({
    backgroundColor: "#fff",
    grid: {
      left: '8%',
      right: '8%',
      top: 20,
      bottom: 20,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      show: false
    },
    yAxis: {
      type: 'category',
      data: categorias,
      axisLabel: {
        color: '#003B5C',
        fontSize: 15,
        fontWeight: 600,
        padding: [0, 0, 0, 4]
      },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: valores,
      barWidth: 22,
      itemStyle: {
        borderRadius: [8, 8, 8, 8],
        color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
          { offset: 0, color: '#003B5C' }, // azul-petroleo
          { offset: 1, color: '#FF6F00' }  // naranja-seguridad
        ])
      },
      label: {
        show: true,
        position: 'right',
        fontSize: 16,
        fontWeight: 'bold',
        color: '#003B5C',
        formatter: v => v.value > 0 ? v.value : ''
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 12,
          shadowColor: '#FF6F00'
        }
      },
      animationDelay: idx => idx * 120
    }],
    animationEasing: 'elasticOut',
    animationDuration: 900
  });

  window.addEventListener('resize', function() {
    chart.resize();
  });
}

// Textura SVG elegante para fondo de barras
function createSoftTextureBarra() {
  const svg = `
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="40" height="40" fill="#fff"/>
      <rect x="0" y="20" width="40" height="2" fill="#B0BEC5" opacity="0.10"/>
      <rect x="0" y="10" width="40" height="1" fill="#B0BEC5" opacity="0.07"/>
      <circle cx="10" cy="30" r="1.2" fill="#FF6F00" opacity="0.10"/>
      <circle cx="30" cy="10" r="1.2" fill="#003B5C" opacity="0.10"/>
    </svg>
  `;
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(svg);
  return img;
}