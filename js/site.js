let urbanURL = encodeURIComponent('https://feature-data.humdata.org/dataset/8da14a27-413d-4485-ac94-90caa5a5d8d1/resource/b67db251-893b-4aac-b389-51573cf321c0/download/urban_consumption.csv');
let slumURL = encodeURIComponent('https://feature-data.humdata.org/dataset/8da14a27-413d-4485-ac94-90caa5a5d8d1/resource/1f49bffe-910e-47ca-a1df-7d6763ef9d40/download/slum_consumption.csv');
let ruralURL = encodeURIComponent('https://feature-data.humdata.org/dataset/8da14a27-413d-4485-ac94-90caa5a5d8d1/resource/af662f6f-ba18-4fee-b59e-2562f482e70d/download/rural_consumption.csv');
let nonCampURL = 'https://proxy.hxlstandard.org/data.json?filter01=add&add-tag01=%23indicator%2Blocation&add-value01=urban&filter02=append&append-dataset02-01='+slumURL+'&filter03=replace&replace-pattern03=%5E%24&replace-regex03=on&replace-value03=slum&replace-tags03=%23indicator%2Blocation&filter04=append&append-dataset04-01='+ruralURL+'&filter05=replace&replace-pattern05=%5E%24&replace-regex05=on&replace-value05=rural&replace-tags05=%23indicator%2Blocation&filter06=select&select-query06-01=%23indicator%2Btier%3DBaseline&strip-headers=on&url='+urbanURL;

let campURL = encodeURIComponent('https://feature-data.humdata.org/dataset/8da14a27-413d-4485-ac94-90caa5a5d8d1/resource/d5aa7ddc-728e-4857-9cb3-9fb84d21aec6/download/camp_consumption.csv');
let largeCampsURL = 'https://proxy.hxlstandard.org/data.json?filter01=select&select-query01-01=%23indicator%2Btier%3DBaseline&strip-headers=on&url='+campURL;
let smallCampsURL = ''

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

function generateMap(geom,data,countryOverview){
    console.log('data for map');
    console.log(data);
    countryOverview('eth');
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

let numFormat = function(d){return d3.format('.3s')(d).replace('G','B')};

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

$.when(nonCampCall,largeCampCall, geomCall).then(function(nonCampArgs,largeCampArgs,geomArgs){
    let nonCampData = hxlProxyToJSON(nonCampArgs[0]);
    let largeCampData = hxlProxyToJSON(largeCampArgs[0]);
    let geomData = topojson.feature(geomArgs[0],geomArgs[0].objects.geom);
    let refugeePopData = getRefugeesPerCountry([nonCampData, largeCampData]);

    let countryOverview = function(iso3){
        let lighting = {};
        let cooking = {};
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