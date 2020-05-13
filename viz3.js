var width = 1200,
    height = 850;
var width_legend = 300;
var height_legend = 15;

function tooltipHtml(n, data) {	/* function to create html content string in tooltip div. */
    return "<h4>" + n + "</h4><p>" +
        "" + (data) + "" +
        "</p>";
}

d3.json("merged_zcta.json").then(function (data) {
    let options = ["total population", "median household income","positive"];
    let titles_legend = {
        "total population": "Total population",
        "median household income": "Median household income (dollars)",
        "positive": "Total positive"
    };
    let total_populations = [];
    let median_household_incomes = [];
    let total_positive = []

    let data_map = new Map();
    let first_item = Object.keys(data)[0];
    Object.keys(data[first_item]).forEach(function (zcta) {
        data_map.set(zcta, new Map());
        let cur_map = data_map.get(zcta);
        total_populations.push(parseFloat(data[first_item][zcta]))
        cur_map.set(first_item, parseFloat(data[first_item][zcta]))
    })
    Object.keys(data).forEach(function (cur_item) {
        console.log(cur_item)

        if (cur_item !== "total population") {
            Object.keys(data[cur_item]).forEach(function (zcta) {
                let cur_map = data_map.get(zcta);
                let cur_value = parseFloat(data[cur_item][zcta]);
                cur_map.set(cur_item, cur_value);

                // add elements to the correct list
                if (cur_item === "median household income") {
                    median_household_incomes.push(cur_value)
                }else if(cur_item ==="positive") {

                    total_positive.push(cur_value)
                }
            })
        } else {
            console.log(cur_item)
        }
    })
    let color_population = d3.scaleSequential()
        .domain(d3.extent(total_populations))
        .interpolator(d3.interpolateYlGnBu)
        .unknown("#ccc");
    let color_median_household_income = d3.scaleSequential()
        .domain(d3.extent(median_household_incomes))
        .interpolator(d3.interpolateRdYlBu)
        .unknown("#ccc");
    let color_positive = d3.scaleSequential()
        .domain(d3.extent(total_positive))
        .interpolator(d3.interpolateRdYlBu)
        .unknown("#ccc");


    d3.json("nyu-2451-34509-geojson.json").then(function (nyc) {
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

        function try_change(sel_option) {
            let cur_color = color_population;
            let x = x_pop;

            gradient_svg.select("#legend-title")
                .text(titles_legend[sel_option]);

            if (sel_option === "total population") {
                cur_color = color_population
                x = x_pop
            } else if (sel_option === "median household income") {
                cur_color = color_median_household_income;
                x = x_median_inc;
            } else if (sel_option === "positive") {
                cur_color = color_positive;
                x = x_positive;
            }
            console.log("Selected option: " + sel_option);
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


		function mouse_out_zipcode(){
			d3.select("#tooltip").transition().duration(700).style("opacity", 0);
		}

        function clicked(d) {

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
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity,
                d3.zoomTransform(svg.node()).invert([width / 2 - 80, height / 2])
            );
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
        let positions = d3.quantize(d3.interpolate(0, elements_legends - 1), elements_legends);
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


        const g = svg.append("g");
        g.append("g")

            .attr("cursor", "pointer")
            .selectAll("path")
            .data(nyc.features)

            .join("path")

            .on("click", clicked)
            .on("mouseover", mouse_over_zipcode).on("mouseout", mouse_out_zipcode)
            .attr("fill", function (d) {
                let zcta = d.properties.zcta;
                let zcta_data = data_map.get(String(zcta))
                if (zcta_data === undefined) {
                    return "#CCC"
                } else {
                    return color_population(zcta_data.get("total population"))
                }

            })
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
            console.log(transform)
            g.attr("transform", transform);
            g.attr("stroke-width", 1 / transform.k);
        }


        var allGroup = ["valueA", "valueB", "valueC"]


        // add the options to the button
        d3.select("body").append("select")
            .attr("id","selectButton")
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
            // recover the option that has been chosen
            var selectedOption = d3.select(this).property("value")
            // run the updateChart function with this selected option
            try_change(selectedOption)
        })

        function mouse_over_zipcode(d){
            var selectedOption = d3.select("#selectButton").property("value")
			//d3.select("#tooltip");
            let zcta_data = data_map.get(String(d.properties.zcta));
            let cur_value = "N/A";
            if (zcta_data !== undefined) {
                cur_value = zcta_data.get(selectedOption)
            }
			d3.select("#tooltip").html(tooltipHtml(titles_legend[selectedOption], cur_value))
                .transition().duration(300).style("opacity", .9)
				.style("left", (d3.event.pageX) + "px")
				.style("top", (d3.event.pageY - 28) + "px");
		}
    });
});


