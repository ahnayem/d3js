const width = screen.availWidth;
const height = 580;
const colors = d3.scaleOrdinal(d3.schemeCategory10);

const rectWidth = 100;
const rectHeight = 40;
const minDistance = Math.sqrt(rectWidth*rectWidth + rectHeight*rectHeight);


const svg = d3.select('svg')
  .on('contextmenu', () => { d3.event.preventDefault(); })
  .attr('width', width)
  .attr('height', height);

const nodes = [
  { id: 0, name: 'State', reflexive: true },
  { id: 1, name: 'State', reflexive: true }
];
let lastNodeId = 2;
const links = [
  { source: nodes[0], target: nodes[1], left: false, right: true }
];

const force = d3.forceSimulation()
  .force('link', d3.forceLink().id((d) => d.id).distance(200))
  .force('charge', d3.forceManyBody())
  .force('x', d3.forceX(width / 2))
  .force('y', d3.forceY(height / 2))
  .on('tick', tick);

const drag = d3.drag()
  .filter(() => d3.event.button === 0 || d3.event.button === 2)
  .on('start', (d) => {
    if (!d3.event.active) force.alphaTarget(0.3).restart();

    d.fx = d.x;
    d.fy = d.y;
  })
  .on('drag', (d) => {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  })
  .on('end', (d) => {
    if (!d3.event.active) force.alphaTarget(0);

    d.fx = null;
    d.fy = null;
  });


const dragLine = svg.append('svg:path')
  .attr('class', 'link dragline hidden')
  .attr('d', 'M0,0L0,0');

let path = svg.append('svg:g').selectAll('path');
let rectangle = svg.append('svg:g').selectAll('g');

let selectedNode = null;
let selectedLink = null;
let mousedownLink = null;
let mousedownNode = null;
let mouseupNode = null;

function resetMouseVars() {
  mousedownNode = null;
  mouseupNode = null;
  mousedownLink = null;
}

function tick() {
  path.attr('d', (d) => {
    const deltaX = d.target.x - d.source.x;
    const deltaY = d.target.y - d.source.y;
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const normX = deltaX / dist;
    const normY = deltaY / dist;
    const sourcePadding = d.left ? 17 : 12;
    const targetPadding = d.right ? 17 : 12;
    const sourceX = d.source.x + (sourcePadding * normX);
    const sourceY = d.source.y + (sourcePadding * normY);
    const targetX = d.target.x - (targetPadding * normX);
    const targetY = d.target.y - (targetPadding * normY);

    return `M${sourceX},${sourceY}L${targetX},${targetY}`;
  });

  rectangle.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
}

function restart() {
  path = path.data(links);

  path.classed('selected', (d) => d === selectedLink)
    .style('marker-start', (d) => d.left ? 'url(#start-arrow)' : '')
    .style('marker-end', (d) => d.right ? 'url(#end-arrow)' : '');

  path.exit().remove();

  path = path.enter().append('svg:path')
    .attr('class', 'link')
    .classed('selected', (d) => d === selectedLink)
    .style('marker-start', (d) => d.left ? 'url(#start-arrow)' : '')
    .style('marker-end', (d) => d.right ? 'url(#end-arrow)' : '')
    .on('mousedown', (d) => {
      if (d3.event.ctrlKey) return;
      mousedownLink = d;
      selectedLink = (mousedownLink === selectedLink) ? null : mousedownLink;
      selectedNode = null;
      restart();
    })
    .merge(path);

  rectangle = rectangle.data(nodes, (d) => d.id);

  rectangle.selectAll('rect')
    .style('stroke', (d) => (d === selectedNode) ? '#eea236' : '#333333')
    .classed('reflexive', (d) => d.reflexive);

  rectangle.exit().remove();

  const g = rectangle.enter().append('svg:g');

  g.append('svg:rect')
    .attr('class', 'node')
  	.attr("x", -rectWidth/2)
  	.attr("y", -rectHeight/2)
  	.attr("width", rectWidth)
  	.attr("height", rectHeight)
      .style('fill', 'white')
      .style('stroke', 'black')
      .classed('reflexive', (d) => d.reflexive)
    .on('mouseover', function (d) {
    	d3.select(this.parentNode).select('rect').style('stroke', '#eea236');
      if (!mousedownNode || d === mousedownNode) return;
      d3.select(this).attr('transform', 'scale(1.1)');
    })
    .on('mouseout', function (d) {
    	if (d === selectedNode) {
    		d3.select(this.parentNode).select('rect').style('stroke', '#eea236');
    	}else{
    		d3.select(this.parentNode).select('rect').style('stroke', '#333333');
    	}
      if (!mousedownNode || d === mousedownNode) return;
      d3.select(this).attr('transform', '');
    })
    .on('mousedown', (d) => {
      if (d3.event.ctrlKey) return;

      mousedownNode = d;
      selectedNode = (mousedownNode === selectedNode) ? null : mousedownNode;
      selectedLink = null;

      dragLine
        .style('marker-end', 'url(#end-arrow)')
        .classed('hidden', false)
        .attr('d', `M${mousedownNode.x},${mousedownNode.y}L${mousedownNode.x},${mousedownNode.y}`);

      restart();
    })
    .on('mouseup', function (d) {
      if (!mousedownNode) return;

      dragLine
        .classed('hidden', true)
        .style('marker-end', '');

      mouseupNode = d;
      if (mouseupNode === mousedownNode) {
        resetMouseVars();
        return;
      }

      d3.select(this).attr('transform', '');

      const isRight = mousedownNode.id < mouseupNode.id;
      const source = isRight ? mousedownNode : mouseupNode;
      const target = isRight ? mouseupNode : mousedownNode;

      const link = links.filter((l) => l.source === source && l.target === target)[0];
      if (link) {
        link[isRight ? 'right' : 'left'] = true;
      } else {
        links.push({ source, target, left: !isRight, right: isRight });
      }

      selectedLink = link;
      selectedNode = null;
      restart();
    });

  g.append('svg:text')
    .attr('x', 0)
    .attr('y', 4)
    .attr('class', 'id')
    .text((d) => d.name + ' ' +d.id);

  rectangle = g.merge(rectangle);

  force
    .nodes(nodes)
    .force('link').links(links);

  force.alphaTarget(0.3).restart();
}


function addState(){
	mousedown();
}


function mousedown() {
  svg.classed('active', true);

  if ( mousedownNode || mousedownLink) return;

  let xp = Math.floor(Math.random() * 1300)+50;
  let yp = Math.floor(Math.random() * 400)+50;

  const node = { id: ++lastNodeId, name: 'State', reflexive: false, x: xp, y: yp };
  nodes.push(node);

  restart();
}

function mousemove() {
  if (!mousedownNode) return;

  dragLine.attr('d', `M${mousedownNode.x},${mousedownNode.y}L${d3.mouse(this)[0]},${d3.mouse(this)[1]}`);
}

function mouseup() {
  if (mousedownNode) {
    dragLine
      .classed('hidden', true)
      .style('marker-end', '');
  }

  svg.classed('active', false);
  resetMouseVars();
}

function spliceLinksForNode(node) {
  const toSplice = links.filter((l) => l.source === node || l.target === node);
  for (const l of toSplice) {
    links.splice(links.indexOf(l), 1);
  }
}

let lastKeyDown = -1;

function keydown() {
  d3.event.preventDefault();

  if (lastKeyDown !== -1) return;
  lastKeyDown = d3.event.keyCode;

  if (d3.event.keyCode === 17) {
    rectangle.call(drag);
    svg.classed('ctrl', true);
    return;
  }
}

function removeState(){
	if (!selectedNode && !selectedLink) return;

	if (selectedNode) {
		nodes.splice(nodes.indexOf(selectedNode), 1);
		spliceLinksForNode(selectedNode);
	} else if (selectedLink) {
		links.splice(links.indexOf(selectedLink), 1);
	}

	selectedLink = null;
	selectedNode = null;
	restart();
}

function keyup() {
  lastKeyDown = -1;

  if (d3.event.keyCode === 17) {
    rectangle.on('.drag', null);
    svg.classed('ctrl', false);
  }
}

svg
  .on('mousemove', mousemove)
  .on('mouseup', mouseup);
d3.select(window)
  .on('keydown', keydown)
  .on('keyup', keyup);
restart();
