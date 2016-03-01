(function ( d3 ) {
    var data;
    var margin = { top: 10, right: 10, bottom: 20, left: 10 };
    var width = 960 - margin.left - margin.right;
    var height = 600 - margin.top - margin.bottom;

    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var dateSelection = [ new Date(2015, 7, 1), new Date(2015, 8, 1) ];

    function dateToString( dt ) {
        return '' + (dt.getFullYear()) + '-' + (dt.getMonth() + 1) + '-' + (dt.getDate())
    }

    function loadFromDateSelection() {

        var url = false && '/api/data/salesstatus/' + dateToString(dateSelection[ 0 ]) + '/' + dateToString(dateSelection[ 1 ]);
        d3.json(url || '2015-08-01to2015-08-03.json').get(function ( error, json ) {
                data = json;
                renderChart();
            });
    }

    loadFromDateSelection();
    buildDateSelection();

    function buildDateSelection() {
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var brushHeight = 30;

        var xDay = d3.time.scale()
            .domain([ new Date(2015, 7, 1), today - 1 ])
            .range([ 0, width ]);

        var brush = d3.svg.brush()
            .x(xDay)
            .extent(dateSelection)
            .on("brush", brushed);

        svg.append("rect")
            .attr("class", "grid-background")
            .attr("width", width)
            .attr("height", brushHeight);

        svg.append("g")
            .attr("class", "x grid")
            .attr("transform", "translate(0," + brushHeight + ")")
            .call(d3.svg.axis()
                .scale(xDay)
                .orient("bottom")
                .ticks(d3.time.months, 1)
                .tickSize(-height)
                .tickFormat(""))
            .selectAll(".tick")
            .classed("minor", function ( d ) {
                return d.getHours();
            });

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + brushHeight + ")")
            .call(d3.svg.axis()
                .scale(xDay)
                .orient("bottom")
                .ticks(d3.time.months, 1)
                .tickPadding(0))
            .selectAll("text")
            .attr("x", 6)
            .style("text-anchor", null);

        var gBrush = svg.append("g")
            .attr("class", "brush")
            .call(brush);

        gBrush.selectAll("rect")
            .attr("height", brushHeight);

        function brushed() {
            var extent0 = brush.extent(),
                extent1;

            // if dragging, preserve the width of the extent
            if ( d3.event.mode === "move" ) {
                var d0 = d3.time.day.round(extent0[ 0 ]),
                    d1 = d3.time.day.offset(d0, Math.round((extent0[ 1 ] - extent0[ 0 ]) / 864e5));
                extent1 = [ d0, d1 ];
            }

            // otherwise, if resizing, round both dates
            else {
                extent1 = extent0.map(d3.time.day.round);

                // if empty when rounded, use floor & ceil instead
                if ( extent1[ 0 ] >= extent1[ 1 ] ) {
                    extent1[ 0 ] = d3.time.day.floor(extent0[ 0 ]);
                    extent1[ 1 ] = d3.time.day.ceil(extent0[ 1 ]);
                }
            }

            d3.select(this).call(brush.extent(extent1));

            if ( extent1[ 0 ] != dateSelection[ 0 ] && extent1[ 1 ] != dateSelection[ 1 ] ) {
                dateSelection = extent1;
                loadFromDateSelection();
            }

        }
    }

    function renderChart() {

        var statusCount = data.length;
        var days = data[ 0 ].values.length;

        var stack = d3.layout.stack()
            .values(function ( d ) {
                return d.values;
            });

        var stackedDatas = stack(data);

        var yStackMax = d3.max(stackedDatas, function ( stackedDatas ) {
            return d3.max(stackedDatas.values, function ( d ) {
                return d.y0 + d.y;
            });
        });

        var x = d3.scale.ordinal()
            .domain(d3.range(days))
            .rangeRoundBands([ 0, width ], 0.08);

        var y = d3.scale.linear()
            .domain([ 0, yStackMax ])
            .range([ height, 0 ]);

        var color = function ( i ) {
            if ( i == 0 ) return "#C4DAF1"; //nouveau
            if ( i == 1 ) return "#9FCBE1"; // prise de contact
            if ( i == 2 ) return "#F3F1D1"; // Pas de contact
            if ( i == 3 ) return "#F5EFB6"; // Bascule CMU
            if ( i == 4 ) return "#F3E765"; // Vente annulée
            if ( i == 5 ) return "#D4E8CE"; // En cours
            if ( i == 6 ) return "#DACFE8"; // Terminée
            if ( i == 7 ) return "#BFA2E3"; // À facturer
            if ( i == 8 ) return "#A06CE3"; // Payé
            if ( i == 9 ) return "#E0A99E"; // "Dossier retourné",
            if ( i == 10 ) return "#D77C6E"; // "Post traitement"
            return "#ddd";
        };

        var xAxis = d3.svg.axis()
            .ticks(20)
            .scale(x)
            .orient("bottom");

        var layer = svg.selectAll(".layer")
            .data(stackedDatas)
            .enter().append("g")
            .attr("class", "layer")
            .style("fill", function ( d, i ) {
                return color(i);
            });

        var rect = layer.selectAll("rect")
            .data(function ( d ) {
                return d.values;
            })
            .enter().append("rect")
            .attr("x", function ( d ) {
                return x(d.x);
            })
            .attr("y", height)
            .attr("width", x.rangeBand())
            .attr("height", function ( d ) {
                return y(d.y);
            });

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        rect
            .attr("y", function ( d ) {
                return y(d.y0 + d.y);
            })
            .attr("height", function ( d ) {
                return y(d.y0) - y(d.y0 + d.y);
            })
            .transition()
            .attr("x", function ( d ) {
                return x(d.x);
            })
            .attr("width", x.rangeBand());

        y.domain([ 0, yStackMax ]);
    }
})(window.d3);
