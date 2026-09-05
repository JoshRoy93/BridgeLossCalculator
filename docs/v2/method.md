# Calculation method

## Supported problem

V2 estimates steady, subcritical free-surface flow through a straight bridge with a horizontal soffit. It uses four ground surveys, one roughness value per section, two bridge opening sections, rectangular piers and an explicit downstream water level for each event.

The section order is downstream exit, downstream opening, upstream opening, upstream approach. Reach lengths are expansion, bridge length and contraction respectively. Survey station increases from left to right looking downstream. Every elevation must use the same vertical datum.

## Geometry

The engine clips each line segment at the water level and integrates the wetted trapezoid. Perimeter includes submerged ground slopes. At opening sections, the engine clips ground to the abutments, adds vertical abutment faces, removes the submerged ground strip occupied by each pier, and adds the pier faces.

Blockage scales wetted area and top width by the unblocked fraction while retaining perimeter. This is an open-area sensitivity assumption. It does not model a debris mat's location, drag or sediment effects.

The survey must extend above the computed water surface on both sides. Duplicate station values are rejected. Represent nearly vertical faces with a small surveyed horizontal offset rather than a duplicate station.

## Energy balance

All terms use SI units. Gravity is 9.80665 m/s². The velocity-head coefficient is one.

```text
A = wetted area
P = wetted perimeter
R = A / P
K = A R^(2/3) / n
V = Q / A
E = water-surface elevation + V² / (2g)
Fr = V / sqrt(g A / top width)

friction loss = L [2Q / (K upstream + K downstream)]²
transition loss = C |V upstream² - V downstream²| / (2g)
residual = E upstream - E downstream - friction loss - transition loss
```

For each upstream section, the solver scans 600 intervals between the bed and the lower of the surveyed banks or applicable soffit. It finds a negative-to-positive residual bracket with Froude number below 0.98, then bisects it. Accepted absolute energy residual is below 0.00001 m, with at most 80 bisection steps. The 0.98 limit leaves a margin near critical flow.

A missing bracket, invalid boundary, survey exceedance or soffit contact produces an unsupported result. It cannot receive an afflux or freeboard verdict. Narrow or complex residual branches can fail the scan; this is a reason to inspect the model, not permission to extrapolate.

## Afflux and freeboard

The bridge-free run uses identical ground surveys, roughness, reach lengths, discharge and downstream boundary. It omits opening clipping, piers, blockage and bridge transition losses. Afflux is bridge-case approach water level minus bridge-free approach water level.

Freeboard is soffit elevation minus the highest calculated water level across the two opening sections and the approach. V2 uses that conservative clearance for its project criterion check.

## Evidence limits

Analytical geometry, SI scaling, prismatic-channel normal flow, conservation residuals and workflow tests establish implementation behaviour. They do not establish calibrated agreement with an independently prepared HEC-RAS model or certify bridge safety.

Use an external model for pressure flow, overtopping, critical or supercritical flow, skew, arches, sloping soffits, floodplain bypass, unsteady flow, scour and sediment transport. An engineer must assess whether uniform section roughness and alpha equal to one suit the site.

The method structure follows the successive energy balances described in [USACE bridge hydraulic computations](https://www.hec.usace.army.mil/confluence/rasdocs/rasum/latest/entering-and-editing-geometric-data/bridges-and-culverts/bridge-hydraulic-computations). V2 does not reproduce the full HEC-RAS bridge routines.
