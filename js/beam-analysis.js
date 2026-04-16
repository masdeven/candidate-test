"use strict";

/**
 * Beam material specification.
 */
class Material {
  constructor(name, properties) {
    this.name = name;
    this.properties = properties;
  }
}

/**
 * Beam configuration for analysis.
 */
class Beam {
  constructor(primarySpan, secondarySpan, material) {
    this.primarySpan = primarySpan;
    this.secondarySpan = secondarySpan;
    this.material = material;
  }
}

/**
 * Core engine for beam force and deflection calculations.
 */
class BeamAnalysis {
  constructor() {
    this.options = {
      condition: "simply-supported",
    };

    this.analyzer = {
      "simply-supported": new BeamAnalysis.analyzer.simplySupported(),
      "two-span-unequal": new BeamAnalysis.analyzer.twoSpanUnequal(),
    };
  }

  getDeflection(beam, load, condition) {
    const analyzer = this.analyzer[condition];
    if (!analyzer) throw new Error("Invalid condition");

    return {
      beam: beam,
      load: load,
      equation: analyzer.getDeflectionEquation(beam, load),
    };
  }

  getBendingMoment(beam, load, condition) {
    const analyzer = this.analyzer[condition];
    if (!analyzer) throw new Error("Invalid condition");

    return {
      beam: beam,
      load: load,
      equation: analyzer.getBendingMomentEquation(beam, load),
    };
  }

  getShearForce(beam, load, condition) {
    const analyzer = this.analyzer[condition];
    if (!analyzer) throw new Error("Invalid condition");

    return {
      beam: beam,
      load: load,
      equation: analyzer.getShearForceEquation(beam, load),
    };
  }
}

BeamAnalysis.analyzer = {};

/**
 * Simply Supported Beam Analyzer.
 */
BeamAnalysis.analyzer.simplySupported = class {
  getDeflectionEquation(beam, load) {
    const w = load;
    const L = beam.primarySpan;
    const EI = beam.material.properties.EI * 1e-9;
    const j2 = parseFloat(document.getElementById("j2")?.value) || 1;

    return (x) => {
      if (x < 0 || x > L) return { x, y: 0 };
      const y = -(w * x * (L ** 3 - 2 * L * x ** 2 + x ** 3)) / (24 * EI);
      return { x, y: y * 1000 * j2 };
    };
  }

  getBendingMomentEquation(beam, load) {
    const w = load;
    const L = beam.primarySpan;
    return (x) => {
      if (x < 0 || x > L) return { x, y: 0 };
      const M = (w * x * (L - x)) / 2;
      return { x, y: M };
    };
  }

  getShearForceEquation(beam, load) {
    const w = load;
    const L = beam.primarySpan;
    return (x) => {
      if (x < 0 || x > L) return { x, y: 0 };
      const V = (w * L) / 2 - w * x;
      return { x, y: V };
    };
  }
};

/**
 * Two Span Unequal Beam Analyzer.
 */
BeamAnalysis.analyzer.twoSpanUnequal = class {
  _calculateReactions(beam, w) {
    const L1 = beam.primarySpan;
    const L2 = beam.secondarySpan || 0;
    const M2 = -(w * (L1 ** 3 + L2 ** 3)) / (8 * (L1 + L2));

    const R1 = (w * L1) / 2 + M2 / L1;
    const R3 = (w * L2) / 2 + M2 / L2;
    const R2 = w * (L1 + L2) - R1 - R3;

    return { R1, R2, R3, M2, L1, L2 };
  }

  getDeflectionEquation(beam, load) {
    const w = load;
    const EI = beam.material.properties.EI * 1e-9;
    const { R1, R2, L1, L2 } = this._calculateReactions(beam, w);
    const L = L1 + L2;
    const C1 = (w * L1 ** 3) / 24 - (R1 * L1 ** 2) / 6;
    const j2 = parseFloat(document.getElementById("j2")?.value) || 1;

    return (x) => {
      if (x < 0 || x > L) return { x, y: 0 };
      let y_EI = (R1 * x ** 3) / 6 - (w * x ** 4) / 24 + C1 * x;
      if (x > L1) y_EI += (R2 * (x - L1) ** 3) / 6;

      const y = (y_EI / EI) * 1000 * j2;
      return { x, y };
    };
  }

  getBendingMomentEquation(beam, load) {
    const w = load;
    const { R1, R2, L1, L2 } = this._calculateReactions(beam, w);
    const L = L1 + L2;
    return (x) => {
      if (x < 0 || x > L) return { x, y: 0 };
      let M = R1 * x - (w * x ** 2) / 2;
      if (x > L1) M += R2 * (x - L1);
      return { x, y: M };
    };
  }

  getShearForceEquation(beam, load) {
    const w = load;
    const { R1, R2, L1, L2 } = this._calculateReactions(beam, w);
    const L = L1 + L2;
    return (x) => {
      if (x < 0 || x > L) return { x, y: 0 };
      let V = R1 - w * x;
      if (x > L1) V += R2;
      return { x, y: V };
    };
  }
};
