(function () {
  "use strict";

  var CM_PER_IN = 2.54;
  var TYPICAL_MIN_IN = 2;
  var TYPICAL_MAX_IN = 3;

  // Ruler range in inches
  var RULER_MIN = 30;
  var RULER_MAX = 50;
  var RULER_TOP = 20;
  var RULER_BOTTOM = 400;
  var SVG_NS = "http://www.w3.org/2000/svg";

  var form = document.getElementById("growth-form");
  var result = document.getElementById("result");
  var svg = document.getElementById("ruler");
  if (!form || !result || !svg) return;

  var thenInput = document.getElementById("height-then");
  var nowInput = document.getElementById("height-now");
  var monthsInput = document.getElementById("months");
  var unitLabels = document.querySelectorAll("[data-unit-label]");

  function currentUnit() {
    var checked = form.querySelector('input[name="unit"]:checked');
    return checked ? checked.value : "in";
  }

  function toInches(value, unit) {
    return unit === "cm" ? value / CM_PER_IN : value;
  }

  function fmt(n) {
    return (Math.round(n * 10) / 10).toFixed(1);
  }

  function yFor(inches) {
    var clamped = Math.max(RULER_MIN, Math.min(RULER_MAX, inches));
    var ratio = (clamped - RULER_MIN) / (RULER_MAX - RULER_MIN);
    return RULER_BOTTOM - ratio * (RULER_BOTTOM - RULER_TOP);
  }

  function el(name, attrs, text) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text) node.textContent = text;
    return node;
  }

  function drawRuler(thenIn, nowIn) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    svg.appendChild(el("rect", { x: 60, y: 10, width: 80, height: 400, rx: 4, "class": "ruler-wood" }));

    // Healthy age-4 range band (5th to 95th percentile, roughly 37 to 43 in)
    var bandTop = yFor(43.1);
    var bandBottom = yFor(37.0);
    svg.appendChild(el("rect", { x: 60, y: bandTop, width: 80, height: bandBottom - bandTop, "class": "ruler-band" }));
    svg.appendChild(el("text", { x: 100, y: bandTop - 6, "text-anchor": "middle", "class": "ruler-band-label" }, "typical at 4"));

    for (var i = RULER_MIN; i <= RULER_MAX; i++) {
      var y = yFor(i);
      var major = i % 2 === 0;
      svg.appendChild(el("line", {
        x1: 60, x2: major ? 82 : 72, y1: y, y2: y,
        "class": major ? "ruler-tick-major" : "ruler-tick"
      }));
      if (major) {
        svg.appendChild(el("text", { x: 52, y: y + 4, "text-anchor": "end", "class": "ruler-num" }, String(i)));
      }
    }

    if (typeof thenIn === "number" && typeof nowIn === "number") {
      var yThen = yFor(thenIn);
      var yNow = yFor(nowIn);
      if (yThen !== yNow) {
        svg.appendChild(el("line", { x1: 125, x2: 125, y1: yNow, y2: yThen, "class": "mark-gap" }));
      }
      svg.appendChild(el("line", { x1: 88, x2: 136, y1: yThen, y2: yThen, "class": "mark-line mark-then" }));
      svg.appendChild(el("text", { x: 146, y: yThen + 4, "class": "mark-label mark-label-then" }, "then"));
      svg.appendChild(el("line", { x1: 88, x2: 136, y1: yNow, y2: yNow, "class": "mark-line mark-now" }));
      svg.appendChild(el("text", { x: 146, y: yNow + 4, "class": "mark-label mark-label-now" }, "now"));
    }
  }

  function showError(message) {
    result.setAttribute("data-state", "error");
    result.textContent = message;
  }

  function showResult(state, figure, lines) {
    result.setAttribute("data-state", state);
    result.textContent = "";
    var fig = document.createElement("p");
    fig.className = "figure";
    fig.textContent = figure;
    result.appendChild(fig);
    lines.forEach(function (line) {
      var p = document.createElement("p");
      p.textContent = line;
      result.appendChild(p);
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    var unit = currentUnit();
    var thenVal = parseFloat(thenInput.value);
    var nowVal = parseFloat(nowInput.value);
    var months = parseFloat(monthsInput.value);

    if (!isFinite(thenVal) || !isFinite(nowVal) || thenVal <= 0 || nowVal <= 0) {
      showError("Enter both heights to check yearly growth.");
      drawRuler();
      return;
    }
    if (!isFinite(months) || months < 6 || months > 24) {
      showError("Use measurements taken 6 to 24 months apart. Shorter gaps are too easily thrown off by small measuring errors.");
      drawRuler();
      return;
    }

    var thenIn = toInches(thenVal, unit);
    var nowIn = toInches(nowVal, unit);

    if (thenIn < 20 || thenIn > 60 || nowIn < 20 || nowIn > 60) {
      showError("These heights are outside the range for a preschooler. Check the units and both numbers.");
      drawRuler();
      return;
    }
    if (nowIn < thenIn) {
      showError("Today's height is lower than the earlier one. Check both measurements and try again.");
      drawRuler(thenIn, nowIn);
      return;
    }

    var yearlyIn = (nowIn - thenIn) * 12 / months;
    var yearlyCm = yearlyIn * CM_PER_IN;
    var figure = unit === "cm"
      ? fmt(yearlyCm) + " cm per year (" + fmt(yearlyIn) + " in)"
      : fmt(yearlyIn) + " in per year (" + fmt(yearlyCm) + " cm)";

    var state, lines;
    if (yearlyIn < TYPICAL_MIN_IN) {
      state = "below";
      lines = [
        "That's below the typical 2 to 3 inches a year for this age.",
        "Home measurements can be off, so measure again carefully, then mention it at your child's next checkup."
      ];
    } else if (yearlyIn <= TYPICAL_MAX_IN) {
      state = "typical";
      lines = [
        "That's within the typical 2 to 3 inches a year for this age.",
        "Keep tracking at regular checkups to see the pattern over time."
      ];
    } else {
      state = "above";
      lines = [
        "That's a bit above the typical 2 to 3 inches a year.",
        "Growth varies from year to year. Your pediatrician can show how it fits your child's curve."
      ];
    }

    showResult(state, figure, lines);
    drawRuler(thenIn, nowIn);
  }

  var lastUnit = currentUnit();

  function handleUnitChange() {
    var unit = currentUnit();
    if (unit !== lastUnit) {
      [thenInput, nowInput].forEach(function (input) {
        var v = parseFloat(input.value);
        if (isFinite(v) && v > 0) {
          input.value = fmt(unit === "cm" ? v * CM_PER_IN : v / CM_PER_IN);
        }
      });
      lastUnit = unit;
    }
    for (var i = 0; i < unitLabels.length; i++) {
      unitLabels[i].textContent = unit;
    }
    result.textContent = "";
    result.removeAttribute("data-state");
    drawRuler();
  }

  form.addEventListener("submit", handleSubmit);
  var radios = form.querySelectorAll('input[name="unit"]');
  for (var r = 0; r < radios.length; r++) {
    radios[r].addEventListener("change", handleUnitChange);
  }

  drawRuler();
})();
