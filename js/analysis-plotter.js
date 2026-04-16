"use strict";

/**
 * Plot result from the beam analysis calculation into a canvas graph.
 */
class AnalysisPlotter {
  constructor(container) {
    this.containerId = container;
    this.canvas = document.getElementById(container);
    this.ctx = this.canvas.getContext("2d");
  }

  plot(data) {
    // Dynamically inject Chart.js if not present
    if (typeof Chart === "undefined") {
      if (!window.chartLoading) {
        window.chartLoading = true;
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js";

        script.onload = () => {
          window.chartLoaded = true;
          this._renderGraph(data);
        };

        document.head.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if (window.chartLoaded) {
            clearInterval(checkInterval);
            this._renderGraph(data);
          }
        }, 50);
      }
    } else {
      this._renderGraph(data);
    }
  }

  _renderGraph(data) {
    const span = data.beam.secondarySpan
      ? data.beam.primarySpan + data.beam.secondarySpan
      : data.beam.primarySpan;

    const points = [];
    const steps = 200;

    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * span;
      const result = data.equation(x);
      points.push({ x: result.x, y: result.y });
    }

    let yLabel = "Value";
    if (this.containerId.includes("deflection")) {
      yLabel = "Deflection (mm)";
    } else if (this.containerId.includes("shear")) {
      yLabel = "Shear Force (kN)";
    } else if (this.containerId.includes("bending")) {
      yLabel = "Bending Moment (kNm)";
    }

    if (typeof Chart !== "undefined") {
      const existingChart = Chart.getChart(this.canvas);
      if (existingChart) {
        existingChart.destroy();
      }
    }

    new Chart(this.ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: yLabel,
            data: points,
            borderColor: "#F44336",
            backgroundColor: "rgba(215, 215, 215, 0.4)",
            borderWidth: 2.5,
            pointRadius: 0,
            showLine: true,
            fill: true,
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: "linear",
            title: { display: true, text: "Span (m)" },
          },
          y: {
            title: { display: true, text: yLabel },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }
}
