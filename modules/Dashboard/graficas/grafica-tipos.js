// Gráfica de Permisos por Tipo - Barras Horizontales
// grafica-tipos.js

// Configuración de la gráfica de tipos
function initTypesChart() {
    // Datos de ejemplo para tipos de permisos
    const typesData = {
        categories: ['Trabajos en Caliente', 'Espacios Confinados', 'Trabajos en Altura', 'Eléctricos', 'Químicos'],
        values: [67, 34, 28, 21, 15],
        colors: ['#D32F2F', '#FF6F00', '#FFC107', '#003B5C', '#00BFA5'],
        riskLevels: ['Alto', 'Alto', 'Medio', 'Medio', 'Bajo']
    };

    // Inicializar gráfica
    const typesChart = echarts.init(document.getElementById('type-chart'));

    // Configuración de la gráfica
    const typesOption = {
        title: {
            show: false
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function(params) {
                const data = params[0];
                const percentage = ((data.value / typesData.values.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                const riskLevel = typesData.riskLevels[data.dataIndex];
                const riskColor = riskLevel === 'Alto' ? '#D32F2F' : riskLevel === 'Medio' ? '#FF6F00' : '#00BFA5';
                
                return `
                    <div style="font-weight: 600; margin-bottom: 3px; font-size: 11px;">${data.name}</div>
                    <div style="display: flex; align-items: center; gap: 5px; font-size: 11px; margin-bottom: 3px;">
                        <span style="display: inline-block; width: 8px; height: 8px; background: ${data.color}; border-radius: 50%;"></span>
                        Permisos: <strong>${data.value}</strong>
                    </div>
                    <div style="font-size: 10px; color: #666; margin-bottom: 3px;">
                        Porcentaje: ${percentage}%
                    </div>
                    <div style="font-size: 10px;">
                        Riesgo: <span style="color: ${riskColor}; font-weight: 600;">${riskLevel}</span>
                    </div>
                `;
            },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#003B5C',
            borderWidth: 1,
            textStyle: {
                color: '#1C1C1C',
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
                color: '#4A4A4A',
                fontSize: 10,
                fontWeight: 500,
                padding: [0, 0, 0, 20]
            },
            axisLabel: {
                color: '#4A4A4A',
                fontSize: 10
            },
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            },
            splitLine: {
                lineStyle: {
                    color: '#F5F5F5',
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
                color: '#4A4A4A',
                fontSize: 10,
                fontWeight: 500,
                interval: 0,
                margin: 8
            },
            axisLine: {
                lineStyle: {
                    color: '#B0BEC5',
                    width: 1
                }
            },
            axisTick: {
                show: false
            }
        },
        series: [{
            name: 'Permisos',
            type: 'bar',
            data: typesData.values.map((value, index) => ({
                value: value,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                        {offset: 0, color: typesData.colors[index]},
                        {offset: 1, color: typesData.colors[index] + '80'}
                    ]),
                    borderRadius: [0, 4, 4, 0],
                    shadowColor: typesData.colors[index] + '30',
                    shadowBlur: 4,
                    shadowOffsetX: 2
                },
                emphasis: {
                    itemStyle: {
                        color: typesData.colors[index],
                        shadowBlur: 6,
                        shadowOffsetX: 3
                    }
                },
                // Agregar etiqueta con el valor
                label: {
                    show: true,
                    position: 'right',
                    distance: 5,
                    formatter: '{c}',
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: '#4A4A4A'
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

    // Aplicar configuración
    typesChart.setOption(typesOption);

    // Hacer responsive
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
                            {offset: 0, color: updatedData.colors[index]},
                            {offset: 1, color: updatedData.colors[index] + '80'}
                        ]),
                        borderRadius: [0, 4, 4, 0],
                        shadowColor: updatedData.colors[index] + '30',
                        shadowBlur: 4,
                        shadowOffsetX: 2
                    },
                    // Mantener las etiquetas al actualizar
                    label: {
                        show: true,
                        position: 'right',
                        distance: 5,
                        formatter: '{c}',
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: '#4A4A4A'
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

    // Retornar funciones públicas
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
    if (document.getElementById('type-chart')) {
        window.typesChartInstance = initTypesChart();
    }
});

// Exportar para uso global1 initTypesChart;