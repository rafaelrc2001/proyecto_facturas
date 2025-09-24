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

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('status-chart')) {
        window.statusChartInstance = initStatusChart();
    }
});

// Exportar para uso global
window.initStatusChart = initStatusChart;