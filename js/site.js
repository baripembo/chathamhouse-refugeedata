let urbanURL = encodeURIComponent('https://feature-data.humdata.org/dataset/8da14a27-413d-4485-ac94-90caa5a5d8d1/resource/b67db251-893b-4aac-b389-51573cf321c0/download/urban_consumption.csv');
let slumURL = encodeURIComponent('https://feature-data.humdata.org/dataset/8da14a27-413d-4485-ac94-90caa5a5d8d1/resource/1f49bffe-910e-47ca-a1df-7d6763ef9d40/download/slum_consumption.csv');
let ruralURL = encodeURIComponent('https://feature-data.humdata.org/dataset/8da14a27-413d-4485-ac94-90caa5a5d8d1/resource/af662f6f-ba18-4fee-b59e-2562f482e70d/download/rural_consumption.csv');
let nonCampURL = 'https://proxy.hxlstandard.org/data.json?filter01=add&add-tag01=%23indicator%2Blocation&add-value01=urban&filter02=append&append-dataset02-01='+slumURL+'&filter03=replace&replace-pattern03=%5E%24&replace-regex03=on&replace-value03=slum&replace-tags03=%23indicator%2Blocation&filter04=append&append-dataset04-01='+ruralURL+'&filter05=replace&replace-pattern05=%5E%24&replace-regex05=on&replace-value05=rural&replace-tags05=%23indicator%2Blocation&filter06=select&select-query06-01=%23indicator%2Btier%3DBaseline&strip-headers=on&url='+urbanURL;

let campURL = encodeURIComponent('https://feature-data.humdata.org/dataset/8da14a27-413d-4485-ac94-90caa5a5d8d1/resource/d5aa7ddc-728e-4857-9cb3-9fb84d21aec6/download/camp_consumption.csv');
let largeCampsURL = 'https://proxy.hxlstandard.org/data.json?filter01=select&select-query01-01=%23indicator%2Btier%3DBaseline&strip-headers=on&url='+campURL;
let smallCampsURL = '';

function hxlProxyToJSON(input){
    var output = [];
    var keys=[]
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                var parts = e2.split('+');
                var key = parts[0]
                if(parts.length>1){
                    var atts = parts.splice(1,parts.length);
                    atts.sort();                    
                    atts.forEach(function(att){
                        key +='+'+att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}

function generateMap(geom,data,countryOverview) {
    var baselayer = L.tileLayer('https://data.humdata.org/mapbox-base-tiles/{z}/{x}/{y}.png', {});
    var baselayer2 = L.tileLayer('https://data.humdata.org/mapbox-layer-tiles/{z}/{x}/{y}.png', {minZoom: 4});

    map = L.map('map',{
        center: [4.5,30],
        zoom: 4,
        layers: [baselayer,baselayer2]
    });

    var cls;
    var style = function(feature) {
        var clr = '#aaaaaa';
        var borderClr = '#f2f2ef';
        var fillClr = '#08306b';
        var fillOpacity = 0;
        cls = 'country'

        var iso3 = feature.properties['ISO_3'];
        if (iso3!=null) {
            var num = data[iso3.toLowerCase()];
            if (num!=undefined) {
                clr = getColor(num);
                fillOpacity = 0.7;
                cls = '';
            }
            else {
                cls = 'no-data';
            }
        }

        return {
            color: borderClr,
            fillColor: clr,
            weight: 1,
            opacity: 1,
            fillOpacity: fillOpacity,
            className: cls
        };
    }

    map.overlay = L.geoJson(geom, {
        style: style,
        onEachFeature: function (feature, layer) {
            feature.properties.bounds_calculated = layer.getBounds();
            if (cls != 'no-data') {
                layer.on({
                    click: mapClick
                });
            }
        }
    }).addTo(map);
}

function getColor(d) {
    return  d > 800000 ? '#08306B' :
            d > 600000 ? '#143C74' :
            d > 400000 ? '#21497E' :
            d > 200000 ? '#2D5688' :
            d > 80000  ? '#3A6392' :
            d > 60000  ? '#46709C' :
            d > 40000  ? '#537DA6' :
            d > 20000  ? '#5F89AF' :
            d > 8000   ? '#6C96B9' :
            d > 6000   ? '#78A3C3' :
            d > 4000   ? '#85B0CD' :
            d > 2000   ? '#91BDD7' :
                         '#9ECAE1' ;
}

function getRefugeesPerCountry(datasets){
    let output = {};
    datasets.forEach(function(dataset){
        dataset.forEach(function(row){
            let country = row['#country+code'];
            if(output[country]===undefined){
                output[country] = Math.round(Number(row['#population+hh+num']));
            } else {
                output[country] += Math.round(Number(row['#population+hh+num']));
            }
        });        
    });
    return output;
}

function mapClick(e) {
    var iso3 = e.target.feature.properties['ISO_3'].toLowerCase();
    countryOverview(iso3);
    $('#countryModal').modal('show');
    //chart.flush();
}

function buildModalOverview(iso3, cooking, lighting) {
    var expTotal = 0;
    var popTotal = refugeePopData[iso3];
    var modal = $('#countryModal');

    modal.find('.modal-title').text(iso3);
    
    //cooking
    modal.find('#cookingChart').empty().append('Cooking<br>');
    for (var prop in cooking) {
        modal.find('#cookingChart').append(prop,': ',cooking[prop],'<br>');
        expTotal = (cooking[prop]==undefined) ? expTotal : expTotal + cooking[prop];
    }

    //ighting
    modal.find('#lightingChart').empty().append('<br>Lighting<br>');
    for (var prop in lighting) {
        modal.find('#lightingChart').append(prop,': ',lighting[prop],'<br>');
        expTotal = (lighting[prop]==undefined) ? expTotal : expTotal + lighting[prop];
    }

    //totals
    modal.find('.exp-total span').text('$'+numFormat(expTotal)+'M');
    modal.find('.exp-percapita span').text('$'+numFormat2((expTotal*1000000)/popTotal));


    // chart = c3.generate({
    //     bindto: '#cookingChart',
    //     data: {
    //         // iris data from R
    //         columns: [
    //             ['data1', 30],
    //             ['data2', 120],
    //         ],
    //         type : 'pie',
    //         onclick: function (d, i) { console.log("onclick", d, i); },
    //         onmouseover: function (d, i) { console.log("onmouseover", d, i); },
    //         onmouseout: function (d, i) { console.log("onmouseout", d, i); }
    //     }
    // });
}


let numFormat = function(d){return d3.format('.1f')(d)};
let numFormat2 = function(d) { return d3.format('.2f')(d); };

let nonCampCall = $.ajax({ 
    type: 'GET', 
    url: nonCampURL,
    dataType: 'json',
});

let largeCampCall = $.ajax({ 
    type: 'GET', 
    url: largeCampsURL,
    dataType: 'json',
});

let geomCall = $.ajax({ 
    type: 'GET', 
    url: 'data/geom.json',
    dataType: 'json',
});

let countryOverview, refugeePopData;
let chart;

$.when(nonCampCall,largeCampCall, geomCall).then(function(nonCampArgs,largeCampArgs,geomArgs){
    let nonCampData = hxlProxyToJSON(nonCampArgs[0]);
    let largeCampData = hxlProxyToJSON(largeCampArgs[0]);
    let geomData = topojson.feature(geomArgs[0],geomArgs[0].objects.geom);
    refugeePopData = getRefugeesPerCountry([nonCampData, largeCampData]);

    countryOverview = function(iso3) {
        let lighting = {};
        let cooking = {};
        let camps = [];

        nonCampData.forEach(function(row){
            if(row['#country+code']===iso3){
                let key = 'On grid';
                let value = Number(row['#indicator+expenditure+grid+value']);
                if(lighting[key] === undefined){
                    lighting[key] = value;
                } else {
                    lighting[key] += value;
                }

                key = row['#indicator+lighting+text'];
                value = Number(row['#indicator+expenditure+offgrid+value']);
                if(lighting[key] === undefined){
                    lighting[key] = value;
                } else {
                    lighting[key] += value;
                }
                
                key = 'Non Solid';
                value = Number(row['#indicator+expenditure+nonsolid+value']);
                if(cooking[key] === undefined){
                    cooking[key] = value;
                } else {
                    cooking[key] += value;
                }

                key = row['#indicator+cooking+text'];
                value = Number(row['#indicator+expenditure+solid+value']);
                if(cooking[key] === undefined){
                    cooking[key] = value;
                } else {
                    cooking[key] += value;
                }                
            }
        });

        largeCampData.forEach(function(row){
            if(row['#country+code']===iso3){
                key = row['#indicator+lighting+text'];
                value = Number(row['#indicator+expenditure+offgrid+value']);
                camps.push(row['#loc+name']);
                if(lighting[key] === undefined){
                    lighting[key] = value;
                } else {
                    lighting[key] += value;
                }
                key = row['#indicator+cooking+text'];
                value = Number(row['#indicator+expenditure+solid+value']);
                if(cooking[key] === undefined){
                    cooking[key] = value;
                } else {
                    cooking[key] += value;
                }                
            }
        });

        //country overview data for cooking and lighting
        //could use total as per capita rate as headline figures
        console.log('Country Overview');
        console.log(lighting);
        console.log(cooking);
        console.log('Example - urban sub cateogry');
        subCountryOverview(iso3,'urban');
        console.log('Example - camp');  
        campOverview('Buramino : Point');

        //build modal    
        buildModalOverview(iso3, cooking, lighting);
        

        //further info
        $('#countryModal').find('.info .info-labels').empty();
        for (var i=0;i<camps.length;i++) {
            $('#countryModal').find('.info .info-labels').append('<p>'+camps[i]+'</p>');
        }
    }

    let campOverview = function(campname){
        let lighting = {};
        let cooking = {};
        largeCampData.forEach(function(row){


            if(row['#loc+name']===campname){
                let key = row['#indicator+lighting+text'];
                let value = Number(row['#indicator+expenditure+offgrid+value']);
                if(lighting[key] === undefined){
                    lighting[key] = value;
                } else {
                    lighting[key] += value;
                }

                key = row['#indicator+cooking+text'];
                value = Number(row['#indicator+expenditure+solid+value']);
                if(cooking[key] === undefined){
                    cooking[key] = value;
                } else {
                    cooking[key] += value;
                }                
            }
        });

        //result of particular camp
        console.log(lighting);
        console.log(cooking);      
    }

    let subCountryOverview = function(iso3, nonCampType){
        let lighting = {};
        let cooking = {};
        nonCampData.forEach(function(row){
            if(row['#country+code']===iso3 && row['#indicator+location'] === nonCampType){
                let key = 'On grid';
                let value = Number(row['#indicator+expenditure+grid+value']);
                if(lighting[key] === undefined){
                    lighting[key] = value;
                } else {
                    lighting[key] += value;
                }

                key = row['#indicator+lighting+text'];
                value = Number(row['#indicator+expenditure+offgrid+value']);
                if(lighting[key] === undefined){
                    lighting[key] = value;
                } else {
                    lighting[key] += value;
                }
                
                key = 'Non Solid';
                value = Number(row['#indicator+expenditure+nonsolid+value']);
                if(cooking[key] === undefined){
                    cooking[key] = value;
                } else {
                    cooking[key] += value;
                }

                key = row['#indicator+cooking+text'];
                value = Number(row['#indicator+expenditure+solid+value']);
                if(cooking[key] === undefined){
                    cooking[key] = value;
                } else {
                    cooking[key] += value;
                }                
            }
        });

        //country overview data for cooking and lighting
        //could use total as per capita rate as headline figures
        console.log(lighting);
        console.log(cooking); 
    }

    generateMap(geomData,refugeePopData,countryOverview);
});