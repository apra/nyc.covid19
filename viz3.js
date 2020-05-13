var width = 1200,
    height = 850;
var width_legend = 300;
var height_legend = 15;
var height_corrplot = 700;

let selected_color = "url(#diagonalHatch)"

function tooltipHtml(n, data) {	/* function to create html content string in tooltip div. */
    return "<h4>" + n + "</h4><p>" +
        "" + (data) + "" +
        "</p>";
}

//d3.json("merged_zcta.json").then(function (data) {
d3.json("https://raw.githubusercontent.com/apra/nyc.covid19/master/merged_zcta.json").then(function (data) {
    let options = ["total population", "median household income", "positive"];
    let titles_legend = {
        "total population": "Total population",
        "median household income": "Median household income (dollars)",
        "positive": "Total positive"
    };
    // to store all the necessary data for easy visualization
    let total_populations = [];
    let median_household_incomes = [];
    let total_positive = [];

    let selected_zcta = [];

    // Import data in a readable way
    let data_map = new Map();
    let first_item = Object.keys(data)[0];
    Object.keys(data[first_item]).forEach(function (zcta) {
        // add zcta to map and to the list of zctas that can be selected
        data_map.set(zcta, new Map());
        selected_zcta.push({
            zcta: zcta,
            selected: false
        });

        let cur_map = data_map.get(zcta);
        total_populations.push(parseFloat(data[first_item][zcta]));
        cur_map.set(first_item, parseFloat(data[first_item][zcta]));
    })
    Object.keys(data).forEach(function (cur_item) {
        if (cur_item !== "total population") {
            Object.keys(data[cur_item]).forEach(function (zcta) {
                let cur_map = data_map.get(zcta);
                let cur_value = parseFloat(data[cur_item][zcta]);
                cur_map.set(cur_item, cur_value);

                // add elements to the correct list
                if (cur_item === "median household income") {
                    median_household_incomes.push(cur_value)
                } else if (cur_item === "positive") {

                    total_positive.push(cur_value)
                }
            })
        } else {
            console.log(cur_item)
        }
    })
    /***
     *
     * Color space definitions
     *
     */
    let color_population = d3.scaleSequential()
        .domain(d3.extent(total_populations))
        .interpolator(d3.interpolateYlGnBu)
        .unknown("#ccc");
    let color_median_household_income = d3.scaleSequential()
        .domain(d3.extent(median_household_incomes))
        .interpolator(d3.interpolatePuBu)
        .unknown("#ccc");
    let color_positive = d3.scaleSequential()
        .domain(d3.extent(total_positive))
        .interpolator(d3.interpolateRdPu)
        .unknown("#ccc");


//    d3.json("nyu-2451-34509-geojson.json").then(function (nyc) {
    d3.json("https://raw.githubusercontent.com/apra/nyc.covid19/master/nyu-2451-34509-geojson.json").then(function (nyc) {
        const zoom = d3.zoom()
            .scaleExtent([1, 4])
            .on("zoom", zoomed);
        let gradient_svg = d3.select("body").append("svg")
            .attr("id", "legend-svg")
            .attr("style", "background-color:white")
            .attr("width", width_legend + 40)
            .attr("height", height_legend + 46);
        var svg = d3.select("body").append("svg")
            .attr("id", "map-svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("width", width)
            .attr("height", height)
            .on("click", reset);
        let corr_svg = d3.select("body").append("svg")
            .attr("id", "corr-svg")
            .attr("width", width)
            .attr("height", height_corrplot);
        corr_svg.append("pattern")
            .attr("id", "diagonalHatch")
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", 4)
            .attr("height", 4)
            .append("path")
            .attr("d", `M-1,1 l2,-2
                       M0,4 l4,-4
                       M3,5 l2,-2`)
            .attr("style", "stroke:#666; stroke-width:1")
        let margin = {top: 10, right: 20, bottom: 30, left: 50};
        let height_graph = height_corrplot - margin.top - margin.bottom;
        let width_graph = width - margin.left - margin.right;
        let corr_g = corr_svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        // Add X axis
        let x_axis = d3.scaleLinear()
            .domain([Math.min(...total_populations), Math.max(...total_populations)])
            .range([0, width_graph]);
        let x_axis_g = corr_g.append("g")
            .attr("transform", "translate(0," + height_graph + ")")
            .call(d3.axisBottom(x_axis));

        // Add Y axis
        let y_axis = d3.scaleLinear()
            .domain([Math.min(...total_positive), Math.max(...total_positive)])
            .range([height_graph, 0]);
        let y_axis_g = corr_g.append("g")
            .call(d3.axisLeft(y_axis));

        // Add a scale for bubble size
        let z_axis = d3.scaleLinear()
            .domain([Math.min(...total_populations), Math.max(...total_populations)])
            .range([3, 20]);


        let cur_color = color_population;
        let cur_property_selected = "total population";
        let cur_data = total_populations;
        /***
         * CREATE CORRELATION PLOT
         */
        let tooltip = d3.select("body")
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "rgba(70,70,70,0.7")
            .style("padding", "10px")
            .style("color", "white")

        let show_tooltip_corr = function (d) {
            d3.event.stopPropagation();
            console.log("over")
            let zcta_data = data_map.get(d.zcta);
            tooltip
                .transition()
                .duration(100)
            tooltip
                .style("display", "block")
                .style("opacity", 1)
                .html("<p><span style = \"font-weight:bold\">" + titles_legend[cur_property_selected] + "</span>: " + zcta_data.get(cur_property_selected) + "</p><p><span style = \"font-weight:bold\">ZCTA</span>: " + d.zcta + "</p>")
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY + 5) + "px")
        }
        let move_tooltip_corr = function (d) {
            d3.event.stopPropagation();
            tooltip
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY + 5) + "px")
        }
        let hide_tooltip_corr = function (d) {
            d3.event.stopPropagation();
            tooltip
                .transition()
                .duration(50)
                .style("opacity", 0)
                .style("display", "none")
        }
        let graphg = corr_g.append("g");
        // add the title
        let title_corrplot = graphg.append("text")
            .text("Confirmed cases of COVID-19 vs "+titles_legend[cur_property_selected] )
            .attr("x", (width_graph/2))
            .attr("y", 20)
            .attr("text-anchor","middle")
            .style('font-size', '30px')
            .style('font-family', '"EB Garamond", serif')
            .style('font-weight', '400');

        graphg
            .selectAll("dot")
            .data(selected_zcta)
            .enter()
            .append("circle")
            .attr("class", "bubbles")
            .attr("cx", function (d, i) {
                console.log(d.zcta)
                let zcta_data = data_map.get(d.zcta);
                return x_axis(zcta_data.get(cur_property_selected));
            })
            .attr("cy", function (d, i) {
                let zcta_data = data_map.get(d.zcta);
                return y_axis(zcta_data.get("positive"));
            })
            .attr("r", function (d) {
                let zcta_data = data_map.get(d.zcta);
                return z_axis(zcta_data.get("total population"));
            })
            .style("fill", function (d) {
                if (d.selected) {
                    return "#444"
                } else {
                    return "rgba(0,0,0,0.1)"
                }
            })
            .on("mouseover", show_tooltip_corr)
            .on("mousemove", move_tooltip_corr)
            .on("mouseleave", hide_tooltip_corr);

        function update_corrplot() {
            title_corrplot
            .text("Confirmed cases of COVID-19 vs "+titles_legend[cur_property_selected] )
            x_axis
                .domain([Math.min(...cur_data), Math.max(...cur_data)])
                .range([0, width_graph]);
            x_axis_g.call(d3.axisBottom(x_axis));
            let circle = graphg.selectAll("circle").data(selected_zcta);
            circle
                .transition(1000)
                .duration(800)
                .attr("cx", function (d, i) {
                    console.log(d)
                    let zcta_data = data_map.get(d.zcta);
                    return x_axis(zcta_data.get(cur_property_selected));
                })
                .attr("cy", function (d, i) {
                    let zcta_data = data_map.get(d.zcta);
                    return y_axis(zcta_data.get("positive"));
                })
                .attr("r", function (d) {
                    let zcta_data = data_map.get(d.zcta);
                    return z_axis(zcta_data.get("total population"));
                })
                .style("fill", function (d) {
                    if (d.selected) {
                        return "#444"
                    } else {
                        return "rgba(0,0,0,0.1)"
                    }
                });

        }

        function try_change(sel_option) {

            cur_property_selected = sel_option
            gradient_svg.select("#legend-title")
                .text(titles_legend[sel_option]);

            if (sel_option === "total population") {
                cur_color = color_population;
                cur_data = total_populations;
                x = x_pop
            } else if (sel_option === "median household income") {
                cur_color = color_median_household_income;
                cur_data = median_household_incomes;
                x = x_median_inc;
            } else if (sel_option === "positive") {
                cur_color = color_positive;
                cur_data = total_positive;
                x = x_positive;
            }
            console.log("Selected option: " + sel_option);
            update_corrplot()

            linearGradient.selectAll("stop")
                .attr("stop-color", function (d, i) {
                    return cur_color(x[i]);
                });
            gradient_svg.selectAll("text:not(#legend-title)")
                .text(function (d, i) {
                    return Math.round(x[i]);
                })
            g.select("g")
                .selectAll("path")
                .transition(1000)
                .attr("fill", function (d) {
                    let zcta_data = data_map.get(String(d.properties.zcta));
                    if (zcta_data === undefined) {
                        return "#CCC"
                    } else {
                        return cur_color(zcta_data.get(sel_option))
                    }

                })
        }


        function mouse_out_zipcode() {
            d3.select("#tooltip").transition().duration(700).style("opacity", 0);
        }

        function clicked(d) {
            console.log(d)
            const [[x0, y0], [x1, y1]] = path.bounds(d);
            d3.event.stopPropagation();
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity
                    .translate(width / 2, height / 2)
                    .scale(Math.min(4, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
                    .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
                d3.mouse(svg.node())
            );
        }

        function reset() {

            svg.selectAll(".selected")
                .attr("fill", fill_path)
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity,
                d3.zoomTransform(svg.node()).invert([width / 2 - 80, height / 2])
            );
            for (let i = 0; i < selected_zcta.length; i++) {
                selected_zcta[i].selected = false
            }
            update_corrplot()
        }

        let projection = d3.geoAlbers()
            .center([0, 40.7128])
            .rotate([74.006, 0])
            .parallels([70, 80])
            .scale(110000)
            .translate([width / 2 - 80, height / 2]);

        let path = d3.geoPath(projection);
        // Gradient definition for legend
        var defs = gradient_svg.append("defs")
        defs.append('style')
            .attr('type', 'text/css')
            .text("@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@200;400;600;700&family=EB+Garamond:wght@400;500;600&display=swap');");
        var linearGradient = defs.append("linearGradient")
            .attr("id", "linear-gradient");

        let elements_legends = 5;
        let x_pop = d3.quantize(d3.interpolate(Math.min(...total_populations), Math.max(...total_populations)), elements_legends);
        let x_median_inc = d3.quantize(d3.interpolate(Math.min(...median_household_incomes), Math.max(...median_household_incomes)), elements_legends);
        let x_positive = d3.quantize(d3.interpolate(Math.min(...total_positive), Math.max(...total_positive)), elements_legends);
        let x = x_pop;

        linearGradient
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0%")
            .selectAll("stop")
            .data(x_pop)
            .enter().append("stop")
            .attr("offset", function (d, i) {
                return i / (elements_legends - 1);
            })
            .attr("stop-color", function (d) {
                return color_population(d);
            });
        let gradient_transl_x = 20
        gradient_svg.append("rect")
            .attr("width", width_legend)
            .attr("height", height_legend)
            .attr("x", gradient_transl_x)
            .attr("fill", "url(#linear-gradient)")
        gradient_svg.append("text")
            .attr("id", "legend-title")
            .attr("width", width_legend)
            .attr('text-anchor', 'middle')
            .attr("y", height_legend + 40)
            .attr("x", (width_legend + gradient_transl_x) / 2)
            .text(titles_legend["total population"])
            .style('font-size', '18px')
            .style('font-family', '"EB Garamond", serif')
            .style('font-weight', '400');
        gradient_svg.selectAll("text:not(#legend-title)")
            .data(x_pop)
            .enter().append("text")
            .attr("x", function (d, i) {
                return i * width_legend / (elements_legends - 1)
            })
            .attr("y", 15 + height_legend)
            .attr("width", 10)
            .attr("height", 10)
            .text(function (d) {
                return Math.round(d)
            })
            .style('font-size', '12px')
            .style('font-family', '"EB Garamond", serif')
            .style('font-weight', '400');

        function fill_path(d) {
            let zcta = d.properties.zcta;
            let zcta_data = data_map.get(String(zcta))
            if (zcta_data === undefined) {
                return "#CCC"
            } else {
                return cur_color(zcta_data.get(cur_property_selected))
            }
        }

        const g = svg.append("g");
        g.append("g")

            .attr("cursor", "pointer")
            .selectAll("path")
            .data(nyc.features)

            .join("path")

            .on("click", function (d) {
                d3.event.stopPropagation();
                let self = d3.select(this)
                let is_selected = self.classed("selected")
                if (is_selected) {
                    self.attr("fill", function (d) {
                        console.log("ok")
                        return fill_path(d)
                    })
                    for (let i = 0; i < selected_zcta.length; i++) {
                        if (selected_zcta[i].zcta == String(d.properties.zcta)) {
                            selected_zcta[i].selected = false
                        }
                    }
                    update_corrplot()

                    self.classed("selected", false)
                } else {
                    self.attr("fill", selected_color)
                    self.classed("selected", true)
                    for (let i = 0; i < selected_zcta.length; i++) {
                        if (selected_zcta[i].zcta == String(d.properties.zcta)) {
                            selected_zcta[i].selected = true
                        }
                    }
                    update_corrplot()
                }
                //clicked(d)
            })
            .on("mouseover", mouse_over_zipcode).on("mouseout", mouse_out_zipcode)
            .attr("fill", fill_path)
            .attr("d", d3.geoPath(projection))
            .append("title");

        g.append("path")
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("stroke-linejoin", "round")
            .attr("d", d3.geoPath(projection)(nyc));


        svg.call(zoom);

        function zoomed() {

            const {transform} = d3.event;
            g.attr("transform", transform);
            g.attr("stroke-width", 1 / transform.k);
        }


        var allGroup = ["valueA", "valueB", "valueC"]


        // add the options to the button
        d3.select("body").append("select")
            .attr("id", "selectButton")
            .selectAll('myOptions')
            .data(options)
            .enter()
            .append('option')
            .text(function (d) {
                return titles_legend[d];
            }) // text showed in the menu
            .attr("value", function (d) {
                return d;
            })
        d3.select("#selectButton").on("change", function (d) {
            reset()
            // recover the option that has been chosen
            var selectedOption = d3.select(this).property("value")
            // run the updateChart function with this selected option
            try_change(selectedOption)
        })

        function mouse_over_zipcode(d) {
            var selectedOption = d3.select("#selectButton").property("value")
            //d3.select("#tooltip");
            let zcta_data = data_map.get(String(d.properties.zcta));
            let cur_value = "N/A";
            if (zcta_data !== undefined) {
                cur_value = zcta_data.get(selectedOption)
            }
            d3.select("#tooltip").html(tooltipHtml(titles_legend[selectedOption], cur_value))
                .transition().duration(100).style("opacity", .9)
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 18) + "px");
        }
    });
});


