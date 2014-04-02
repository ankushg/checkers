//This script extracts parameters from the URL
//from jquery-howto.blogspot.com
$.extend({
  getUrlVars : function() {
      var vars = [], hash;
      var hashes = window.location.href.slice(
              window.location.href.indexOf('?') + 1).split('&');
      for ( var i = 0; i < hashes.length; i++) {
          hash = hashes[i].split('=');
          vars.push(hash[0]);
          vars[hash[0]] = hash[1];
      }
      return vars;
  },
  getUrlVar : function(name) {
      return $.getUrlVars()[name];
  }
});

var DEFAULT_BOARD_SIZE = 8;

//data model
var board;
var rules;
var whoseTurn = "black";
var undoStack = [];
var redoStack = [];

var directionOf = function(color) {
  if (color == "black") {
    return -1;
  }
  return 1;
};

// The color parameter should be either "black" or "red"
var toggleTurn = function(color) {
  $("#turnIndicator").html(color + "'s turn");
  whoseTurn = color;
};



// This allows the Javascript code inside this block to only run when the page
// has finished loading in the browser.
$(document).ready(function() {
    if ($.getUrlVar('size') && $.getUrlVar('size') >= 6) {
        board = new Board($.getUrlVar('size'));
    } else {
        board = new Board(DEFAULT_BOARD_SIZE);
    }

  rules = new Rules(board);

  var cellsize = 400 / board.boardSize;

  var clearArrows = function () {
    var canvas = document.getElementById("arrowcanvas");
    var context = canvas.getContext('2d');
    // remove previous arrow
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  var clearBoard = function (){
    var checkerboard = document.getElementById("checkerboard");
    $(checkerboard).html('');

    for (var i=0; i<board.boardSize; i++){
        var row = checkerboard.appendChild(document.createElement("div"));
        $(row).css('height', cellsize);
        for (var j=0; j<board.boardSize; j++){
          var span = document.createElement("span");
          span.row = i;
          span.col = j;
          $(span).css('width', cellsize).css('height', cellsize);
          $(span).droppable({
            accept: ".checker",
            drop: function (event, ui){
              var checker = board.getCheckerAt(ui.draggable[0].row, ui.draggable[0].col);
              var move = rules.makeMove(checker, directionOf(whoseTurn), directionOf(checker.color), event.target.row, event.target.col);
              if(move !== null) {
                redoStack = [];
                toggleTurn((whoseTurn==="red") ? "black" : "red");
                undoStack.push(move);              }
            }
          });
          row.appendChild(span);
        }
    }

    clearArrows();
  };

  clearBoard();

  var getCellAt = function (row, col){
    return $('#checkerboard > div:eq(' + row + ') > span:eq(' + col + ')');
  };

  var drawCheckerAt = function (checker, row, col){
    var base_image = new Image();
    base_image.height = cellsize;
    base_image.width = cellsize;
    base_image.src = "graphics/" + checker.color + (checker.isKing ? "-king.png" : "-piece.png");
    base_image.row = row;
    base_image.col = col;
    $(base_image).addClass('checker');
    $(base_image).addClass(checker.color);

    $(base_image).draggable({
      stop: function(event, ui) {
        $(this).draggable('enable');
      },
      containment: '#checkerboard',
      revert: 'valid'
    });

    base_image.onload = function() {
      $(getCellAt(row, col)).html(base_image);
    };

  };

  var removeCheckerAt = function (row, col){
    getCellAt(row, col).html('');
  };


  var drawArrow = function (fromx, fromy, tox, toy){
    var canvas = document.getElementById("arrowcanvas");
    var context = canvas.getContext('2d');

    clearArrows();

    // draw new arrow
    var headlen = 10;
    var angle = Math.atan2(toy-fromy,tox-fromx);
    context.beginPath();
    context.moveTo(fromx, fromy);
    context.lineTo(tox, toy);
    context.lineTo(tox-headlen*Math.cos(angle-Math.PI/6),toy-headlen*Math.sin(angle-Math.PI/6));
    context.moveTo(tox, toy);
    context.lineTo(tox-headlen*Math.cos(angle+Math.PI/6),toy-headlen*Math.sin(angle+Math.PI/6));
    context.closePath();
    context.strokeStyle="yellow";
    context.lineWidth=5;
    context.stroke();
  };

  board.addEventListener('add',function (e) {
    drawCheckerAt(e.details.checker, e.details.row, e.details.col);
  },true);

  board.addEventListener('move',function (e) {
    removeCheckerAt(e.details.fromRow, e.details.fromCol);
    drawCheckerAt(e.details.checker, e.details.toRow, e.details.toCol);
    drawArrow((e.details.fromCol + 0.5) * cellsize, (e.details.fromRow + 0.5) * cellsize,
              (e.details.toCol + 0.5) * cellsize, (e.details.toRow + 0.5) * cellsize);
  }, true);

  board.addEventListener('remove', function(e) {
    removeCheckerAt(e.details.row, e.details.col);
  }, true);

  board.addEventListener('promote',function (e) {
    removeCheckerAt(e.details.row, e.details.col);
    drawCheckerAt(e.details.checker, e.details.row, e.details.col);
  }, true);

  var undo = function(){
    var move = undoStack.pop();
    toggleTurn(whoseTurn=="red" ? "black" : "red");
    var checker = board.getCheckerAt(move.to_row, move.to_col);
    if(move.made_king){
      checker.isKing = false;
    }

    board.moveTo(checker, move.from_row, move.from_col);

    for(var c in move.removed){
      if(c !== null){
        var newChecker = Checker(c.color, c.isKing);
        board.add(newChecker, c.row, c.col);
      }
    }
    redoStack.push(move);
  };

  var redo = function(){
    var move = redoStack.pop();
    toggleTurn( whoseTurn=="red" ? "black" : "red");
    var checker = board.getCheckerAt(move.from_row, move.from_col);
    if(move.made_king) checker.isKing = true;

    board.moveTo(checker, move.to_row, move.to_col);

    for(var c in move.removed){
      board.removeAt(c.row, c.col);
    }
    undoStack.push(move);
  };

  $("#btnNewGame").click(function(evt){
      clearBoard();
      board.prepareNewGame();
      toggleTurn("black");
  });

  $("#btnAutoMove").click(function(evt) {
    var playerDirection = directionOf(whoseTurn);
    var result = rules.makeRandomMove(whoseTurn, playerDirection);
    if (result !== null) {
      redoStack = [];
      undoStack.push(result);
      toggleTurn( whoseTurn=="red" ? "black" : "red");
    }
  });

  $("#btnUndo").click(function(evt){
    undo();
  });

  $("#btnRedo").click(function(evt){
    redo();
  });
  board.prepareNewGame();
});
