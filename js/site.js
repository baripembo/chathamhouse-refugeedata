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
    //remove loader
    $('.sp-circle').remove();

    var baselayer = L.tileLayer('https://data.humdata.org/mapbox-base-tiles/{z}/{x}/{y}.png', {});
    var baselayer2 = L.tileLayer('https://data.humdata.org/mapbox-layer-tiles/{z}/{x}/{y}.png', {minZoom: 2});

    map = L.map('map',{
        center: [0,0],
        zoom: 2,
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
    return  d > 800000 ? '#005984' :
            d > 600000 ? '#13658C' :
            d > 400000 ? '#267195' :
            d > 200000 ? '#397D9D' :
            d > 80000  ? '#4C89A6' :
            d > 60000  ? '#5F95AE' :
            d > 40000  ? '#72A2B7' :
            d > 20000  ? '#85AEC0' :
            d > 8000   ? '#98BAC8' :
            d > 6000   ? '#ABC6D1' :
            d > 4000   ? '#BED2D9' :
            d > 2000   ? '#D1DEE2' :
                         '#E4EBEB' ;
}

function mapClick(e) {
    var iso3 = e.target.feature.properties['ISO_3'].toLowerCase();
    countryOverview(iso3);
    $('#countryModal').modal('show');

    cookingChart.flush();
    lightingChart.flush();
}

function buildModalOverview(iso3, cooking, lighting) {
    var expTotal = 0;
    var popTotal = refugeePopData[iso3];
    var modal = $('#countryModal');

    modal.find('.modal-title').text(countryNames[iso3]);
    
    //cooking
    var cookingData = [];
    for (var prop in cooking) {
        expTotal = (cooking[prop]==undefined) ? expTotal : expTotal + cooking[prop];
        cookingData.push([prop, numFormat(cooking[prop])]);
    }

    //lighting
    var lightingData = [];
    for (var prop in lighting) {
        expTotal = (lighting[prop]==undefined) ? expTotal : expTotal + lighting[prop];
        lightingData.push([prop, numFormat(lighting[prop])]);
    }

    //totals
    modal.find('.exp-total span').text('$'+numFormat(expTotal)+'M');
    modal.find('.exp-percapita span').text( getExpPerCapita(expTotal, popTotal) );

    //pie charts
    cookingChart = buildPieChart('cooking',cookingData);
    lightingChart = buildPieChart('lighting',lightingData);
}

function buildModalInfo(camp) {
    var expTotalCooking = 0;
    var expTotalLighting = 0;
    var campCls = 'camp'+camp.id;
    var modal = $('#countryModal');

    //cooking
    var cookingData = [];
    for (var key in camp.cooking) {
        expTotalCooking = (camp.cooking[key]==undefined) ? expTotalCooking : expTotalCooking + camp.cooking[key];
        cookingData.push([key, numFormat(camp.cooking[key])]);
    }

    //lighting
    var lightingData = [];
    for (var key in camp.lighting) {
        expTotalLighting = (camp.lighting[key]==undefined) ? expTotalLighting : expTotalLighting + camp.lighting[key];
        lightingData.push([key, numFormat(camp.lighting[key])]);
    }

    modal.find('.info').append('<div class="row camp '+campCls+'"><div class="col-md-4 info-labels">'+camp.name+'</div><div class="col-md-4 cooking"></div><div class="col-md-4 lighting"></div></div>');

    //totals
    modal.find('.'+campCls+' .cooking').html( 'Exp: $'+numFormat(expTotalCooking)+'M<br>Per Cap: '+ getExpPerCapita(expTotalCooking, camp.pop) );
    modal.find('.'+campCls+' .lighting').html( 'Exp: $'+numFormat(expTotalLighting)+'M<br>Per Cap: '+ getExpPerCapita(expTotalLighting, camp.pop) );

    //pie charts
    //cookingChart = buildPieChart('cooking',cookingData);
    //lightingChart = buildPieChart('lighting',lightingData);
}

function buildPieChart(title, data) {
    var chart = c3.generate({
        title: {
            text: title
        },
        bindto: '#'+title+'Chart',
        data: {
            columns: data,
            type : 'pie'
        },
        size: {
            height: 300
        },
        color: {
            pattern: pieColors
        },
        pie: {
            label: {
                format: function (value, ratio, id) {
                    return d3.format('$')(value)+'M';
                },
                threshold: 0.05
            }
        }
    });
    return chart;
}

function getExpPerCapita(total, pop) {
    return '$'+numFormat((total*1000000)/pop);
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

function getCountryNames(datasets) {
    let output = {};
    datasets.forEach(function(row){
       output[row.code.toLowerCase()] = row.name;
    });
    return output;
}


let numFormat = function(d){return d3.format('.2f')(d)};

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

let countriesCall = $.ajax({ 
    type: 'GET', 
    url: 'data/countries.json',
    dataType: 'json',
});

let countryOverview, refugeePopData, countryNames;
let cookingChart, lightingChart;
let pieColors = ['#005984','#397D9D','#72A2B7','#ABC6D1'];

$.when(nonCampCall,largeCampCall,geomCall,countriesCall).then(function(nonCampArgs,largeCampArgs,geomArgs,countriesArgs){
    let nonCampData = hxlProxyToJSON(nonCampArgs[0]);
    let largeCampData = hxlProxyToJSON(largeCampArgs[0]);
    let geomData = topojson.feature(geomArgs[0],geomArgs[0].objects.geom);
    refugeePopData = getRefugeesPerCountry([nonCampData, largeCampData]);
    countryNames = getCountryNames(countriesArgs[0].countries);

    countryOverview = function(iso3) {
        let lighting = {};
        let cooking = {};
        let camps = [];
        let noncamps = [];

        nonCampData.forEach(function(row){
            if(row['#country+code']===iso3){
                let key = 'On grid';
                let value = Number(row['#indicator+expenditure+grid+value']);
                noncamps.push(row['#indicator+location']);
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
        // console.log('Example - urban sub cateogry');
        // subCountryOverview(iso3,'urban');
        //console.log('Example - camp');  
        //campOverview('Buramino : Point');

        //build modal    
        buildModalOverview(iso3, cooking, lighting);

        //clear the info columns in modal
        $('#countryModal').find('.info').children().filter(':gt(1)').remove();

        //get noncamp info
        noncamps.forEach(function(noncamp, id) {
            subCountryOverview(iso3, noncamp, id);
        });

        //get camp info
        camps.forEach(function(camp, id) {
            campOverview(camp, id);
        });
    }

    let campOverview = function(campname, id){
        let camp = {'name':campname, 'id': id};
        let lighting = {};
        let cooking = {};
        largeCampData.forEach(function(row){
            if(row['#loc+name']===campname){
                let key = row['#indicator+lighting+text'];
                let value = Number(row['#indicator+expenditure+offgrid+value']);
                camp.pop = Number(row['#population+hh+num']);
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
        // console.log('lighting',lighting);
        // console.log('cooking',cooking);      

        //build modal  
        camp.cooking = cooking;
        camp.lighting = lighting;
        buildModalInfo(camp);
    }

    let subCountryOverview = function(iso3, nonCampType, id){
        let noncamp = {'name':nonCampType, 'id': id};
        let lighting = {};
        let cooking = {};
        nonCampData.forEach(function(row){
            if(row['#country+code']===iso3 && row['#indicator+location'] === nonCampType){
                let key = 'On grid';
                let value = Number(row['#indicator+expenditure+grid+value']);
                noncamp.pop = Number(row['#population+hh+num']);
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
        // console.log(lighting);
        // console.log(cooking); 


        //build modal  
        noncamp.cooking = cooking;
        noncamp.lighting = lighting;
        buildModalInfo(noncamp);
    }

    generateMap(geomData,refugeePopData,countryOverview);
});