$(function(){
  var cy = window.cy = cytoscape({
    container: document.getElementById('cy'),

    boxSelectionEnabled: false,
    autounselectify: true,
    
    layout: {
      name: 'polywas',
      boundingBox: {x1: 0, y1: 0, w:$('#cyCol').width(), h:$(window).height()},
    },
    style: [
       {
         selector: '[type = "gene"]',
         style: {
           'content': 'data(id)',
           'color': 'white',
           'text-valign': 'center',
           'text-halign': 'center',
           'background-color': '#62c',
           'shape': 'circle',
         }
       },
       {
        selector: '[type = "locus"]',
        css: {
          'background-color': 'black',
          'content': 'data(id)',
          'color': 'white',
          'text-valign': 'center',
          'text-halign': 'center',
          'text-background-color': 'black',
          'text-background-opacity': '1',
          'text-background-shape': 'roundrectangle',
        }
      },
       {
         selector: 'edge',
         css: {
           'curve-style': 'unbundled-bezier',
           'width': 3,
           'opacity': 0.5,
           'line-color': 'black'
         }
       }
     ],
   elements: {
    nodes: [
      {data: {id: '1', type: 'locus', chrom: '1', start: 10, end: 10000}},
      {data: {id: '2', type: 'locus', chrom: '2', start: 0, end: 100000}},
      {data: {id: '3', type: 'locus', chrom: '3', start: 10, end: 10000}},
      {data: {id: '4', type: 'locus', chrom: '4', start: 100, end: 10000}},
      {data: {id: '5', type: 'locus', chrom: '5', start: 100, end: 10000}},
      {data: {id: 'a', type: 'gene', locus: '1', chrom: '1', start: 25, end: 150}},
      {data: {id: 'b', type: 'gene', locus: '1', chrom: '1', start: 9000, end: 9190}},
      {data: {id: 'c', type: 'gene', locus: '2', chrom: '2', start: 1000, end: 2000}},
      {data: {id: 'd', type: 'gene', locus: '2', chrom: '2', start: 99000, end: 99099}},
      {data: {id: 'e', type: 'gene', locus: '3', chrom: '3', start: 5000, end: 6000}},
    ],
    edges: [
      { data: { id: 'ad', source: 'a', target: 'd' } },
      { data: { id: 'eb', source: 'e', target: 'd' } }]}});
    });