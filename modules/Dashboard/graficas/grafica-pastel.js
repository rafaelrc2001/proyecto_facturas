// Gráfica de Permisos por Estatus - Gráfica de Pastel
// grafica-estatus.js

// Estilos específicos para la gráfica de estatus
const statusChartStyles = `
    .pie-chart {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        padding: 25px;
        display: flex;
        flex-direction: column;
        height: 400px;
    }

    .pie-chart .chart-title {
        font-size: 1.3rem;
        color: var(--negro-carbon);
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: 'Montserrat', sans-serif;
        font-weight: 600;
    }

    .pie-chart .chart-title i {
        color: var(--verde-tecnico);
        font-size: 1.4rem;
    }

    #status-chart {
        width: 100%;
        height: 300px;
        flex-grow: 1;
    }

    .status-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid var(--blanco-neutro);
        justify-content: center;
    }

    .status-legend-item {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.8rem;
        color: var(--gris-acero);
    }

    .status-legend-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }
`;

// Inyectar estilos en el documento
function injectStatusChartStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = statusChartStyles;
    document.head.appendChild(styleSheet);
}

// Configuración de la gráfica de estatus
function initStatusChart() {
    // Inyectar estilos
    injectStatusChartStyles();

    // Datos de ejemplo para estatus
    const statusData = {
        categories: ['Completado', 'En Proceso', 'Pendiente', 'Cancelado', 'Vencido'],
        values: [89, 45, 23, 12, 3],
        colors: ['#00BFA5', '#FF6F00', '#FFC107', '#D32F2F', '#003B5C'],
        icons: ['✓', '⚡', '⏱️', '✗', '⚠️']
    };

    // Inicializar gráfica
    const statusChart = echarts.init(document.getElementById('status-chart'));

    // Preparar datos para la gráfica de pastel
    const pieData = statusData.categories.map((category, index) => ({
        value: statusData.values[index],
        name: `${statusData.icons[index]} ${category}`,
        itemStyle: {
            color: statusData.colors[index]
        }
    }));

    // Configuración de la gráfica de pastel
    const statusOption = {
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                const total = statusData.values.reduce((a, b) => a + b, 0);
                const percentage = ((params.value / total) * 100).toFixed(1);
                return `
                    <div style="font-weight: 600; margin-bottom: 5px;">
                        ${params.name}
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 3px;">
                        <span style="display: inline-block; width: 10px; height: 10px; background: ${params.color}; border-radius: 50%;"></span>
                        Cantidad: <strong>${params.value}</strong>
                    </div>
                    <div style="color: #666; font-size: 11px;">
                        Porcentaje: ${percentage}%
                    </div>
                `;
            },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#00BFA5',
            borderWidth: 1,
            textStyle: {
                color: '#1C1C1C',
                fontSize: 12
            }
        },
        legend: {
            orient: 'horizontal',
            bottom: '0%',
            data: statusData.categories.map((category, index) => `${statusData.icons[index]} ${category}`),
            textStyle: {
                color: '#4A4A4A',
                fontSize: 11
            },
            itemGap: 15,
            itemWidth: 12,
            itemHeight: 12,
            formatter: function(name) {
                // Acortar nombres largos para la leyenda
                if (name.length > 15) {
                    return name.substring(0, 12) + '...';
                }
                return name;
            }
        },
        series: [
            {
                name: 'Estatus de Permisos',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '45%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    formatter: function(params) {
                        const total = statusData.values.reduce((a, b) => a + b, 0);
                        const percentage = ((params.value / total) * 100).toFixed(1);
                        return `${params.name}: ${percentage}%`;
                    },
                    fontSize: 11,
                    color: '#4A4A4A'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 12,
                        fontWeight: 'bold'
                    },
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                labelLine: {
                    show: true,
                    length: 10,
                    length2: 5
                },
                data: pieData,
                animationType: 'scale',
                animationEasing: 'elasticOut',
                animationDelay: function (idx) {
                    return idx * 150;
                }
            }
        ]
    };

    // Aplicar configuración
    statusChart.setOption(statusOption);

    // Hacer responsive
    window.addEventListener('resize', function() {
        statusChart.resize();
    });

    // Función para actualizar datos
    function updateStatusChart(newData) {
        const updatedData = {
            categories: newData.categories || statusData.categories,
            values: newData.values || statusData.values,
            colors: newData.colors || statusData.colors,
            icons: newData.icons || statusData.icons
        };

        const updatedPieData = updatedData.categories.map((category, index) => ({
            value: updatedData.values[index],
            name: `${updatedData.icons[index]} ${category}`,
            itemStyle: {
                color: updatedData.colors[index]
            }
        }));

        const updatedOption = {
            legend: {
                data: updatedData.categories.map((category, index) => `${updatedData.icons[index]} ${category}`)
            },
            series: [{
                data: updatedPieData
            }]
        };
        statusChart.setOption(updatedOption);
    }

    // Retornar funciones públicas
    return {
        chart: statusChart,
        updateData: updateStatusChart,
        resize: () => statusChart.resize()
    };
}

// Elimina o comenta este bloque para evitar la gráfica de ejemplo:
// document.addEventListener('DOMContentLoaded', function() {
//   const chartDom = document.getElementById('distribution-chart');
//   if (!chartDom) return;
//   const chart = echarts.init(chartDom);
//
//   // Datos de ejemplo, reemplaza por tus datos reales
//   const data = [
//     { value: 42, name: 'Tickets' },
//     { value: 45, name: 'Facturas' }
//   ];
//
//   chart.setOption({
//     backgroundColor: "#fff",
//     tooltip: {
//       trigger: 'item',
//       formatter: '{b}: {c} ({d}%)'
//     },
//     legend: {
//       orient: 'vertical',
//       left: 'left',
//       data: data.map(d => d.name),
//       textStyle: { color: '#476D7C', fontSize: 12 }
//     },
//     series: [{
//       name: 'Distribución',
//       type: 'pie',
//       radius: '60%',
//       center: ['55%', '55%'],
//       data: data,
//       label: {
//         color: '#111827',
//         fontSize: 12,
//         formatter: '{b}: {c}'
//       },
//       itemStyle: {
//         borderRadius: 6,
//         borderColor: '#fff',
//         borderWidth: 2
//       }
//     }]
//   });
//
//   window.distributionChartInstance = chart;
// });

function actualizarGraficaPastel(registros) {
  let totalFacturas = 0;
  let totalTickets = 0;

  registros.forEach((fila) => {
    const tipo = (fila[2] || "").trim().toLowerCase();
    if (tipo === "factura") totalFacturas++;
    else if (tipo === "ticket") totalTickets++;
  });

  const total = totalFacturas + totalTickets;
  const percentTickets = total ? ((totalTickets / total) * 100).toFixed(2) : 0;
  const percentFacturas = total ? ((totalFacturas / total) * 100).toFixed(2) : 0;

  const chartDom = document.getElementById('distribution-chart');
  if (!chartDom) return;
  const chart = echarts.init(chartDom);

  // Estado central dinámico
  let centralText = {
    percent: `${total}`,
    label: 'Total registros',
    color: '#003B5C'
  };

  function getCentralGraphic(percent, label, color) {
    return [
      {
        type: 'group',
        left: 'center',
        top: 'center',
        children: [
          {
            type: 'text',
            style: {
              text: percent,
              font: '400 28px Montserrat, Roboto, Arial',
              fill: color,
              textAlign: 'center',
              transition: 'all 0.3s'
            },
            left: 'center',
            top: -10
          },
          {
            type: 'text',
            style: {
              text: label,
              font: '400 15px Montserrat, Roboto, Arial',
              fill: '#4A4A4A',
              textAlign: 'center',
              transition: 'all 0.3s'
            },
            left: 'center',
            top: 22
          }
        ]
      }
    ];
  }

  chart.setOption({
    backgroundColor: {
      type: 'pattern',
      image: createSoftTexture(),
      repeat: 'repeat'
    },
    legend: {
      orient: 'horizontal',
      top: 10,
      left: 'center',
      data: ['Facturas', 'Tickets'],
      textStyle: {
        color: '#003B5C',
        fontWeight: 500,
        fontSize: 15
      },
      itemWidth: 18,
      itemHeight: 10,
      icon: 'circle'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#B0BEC5',
      borderWidth: 1,
      textStyle: { color: '#4A4A4A', fontWeight: 'normal', fontSize: 13 },
      formatter: params => `
        <div style="font-weight:500;color:#003B5C;">${params.name}</div>
        <div style="color:#4A4A4A;">Cantidad: <strong>${params.value}</strong></div>
        <div style="color:#FF6F00;">Porcentaje: ${params.percent}%</div>
      `
    },
    series: [{
      name: 'Distribución',
      type: 'pie',
      radius: ['60%', '80%'],
      center: ['50%', '55%'],
      avoidLabelOverlap: false,
      label: {
        show: true,
        position: 'outside',
        fontSize: 15,
        color: '#4A4A4A',
        formatter: '{b}\n{d}%'
      },
      labelLine: {
        show: true,
        length: 25,
        length2: 10,
        lineStyle: {
          color: '#B0BEC5',
          width: 1.5
        }
      },
      itemStyle: {
        borderRadius: 12,
        borderColor: '#fff',
        borderWidth: 4,
        shadowBlur: 12,
        shadowColor: 'rgba(0,59,92,0.10)'
      },
      emphasis: {
        scale: true,
        scaleSize: 10,
        itemStyle: {
          shadowBlur: 24,
          shadowColor: '#FF6F00'
        }
      },
      animationType: 'scale',
      animationEasing: 'cubicOut',
      animationDelay: idx => idx * 120,
      data: [
        {
          value: totalFacturas,
          name: 'Facturas',
          itemStyle: {
            color: '#003B5C',
            shadowColor: 'rgba(0,35,60,0.25)'
          }
        },
        {
          value: totalTickets,
          name: 'Tickets',
          itemStyle: {
            color: '#FF6F00',
            shadowColor: 'rgba(255,111,0,0.18)'
          }
        }
      ]
    }],
    graphic: getCentralGraphic(centralText.percent, centralText.label, centralText.color)
  });

  // Evento dinámico para el centro
  chart.on('mouseover', function(params) {
    if (params.seriesType === 'pie') {
      chart.setOption({
        graphic: getCentralGraphic(
          `${params.percent}%`,
          params.name,
          params.data.itemStyle.color
        )
      });
    }
  });

  chart.on('mouseout', function(params) {
    chart.setOption({
      graphic: getCentralGraphic(
        centralText.percent,
        centralText.label,
        centralText.color
      )
    });
  });

  window.distributionChartInstance = chart;
}

// Textura SVG más suave y elegante
function createSoftTexture() {
  const svg = `
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="40" height="40" fill="#fff"/>
      <circle cx="10" cy="10" r="1.2" fill="#B0BEC5" opacity="0.13"/>
      <circle cx="30" cy="30" r="1.2" fill="#B0BEC5" opacity="0.13"/>
      <circle cx="30" cy="10" r="1" fill="#FF6F00" opacity="0.09"/>
      <circle cx="10" cy="30" r="1" fill="#003B5C" opacity="0.09"/>
    </svg>
  `;
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(svg);
  return img;
}