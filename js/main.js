$(function(){

  Utils.import("js/models.js");
  Utils.import("js/views.js");

  var Game = {
    initialize: function() {
      if (Utils.isSupported()) {

        var model = new GameState();

        new Stage({model: model}).render();
        new MenuScene({model: model});
        new GameScene({model: model});

        model.set("scene", "menu");

        $("#stage").on("dragstart selectstart", "*", function(event) {return false; });

        document.ontouchmove = function(e) { e.preventDefault(); };
      } else {
        $("#unsupported").show();
      }
    }
  };


  /******** START THE GAME *******/

  Game.initialize();

});


var Utils = {

  bp: function() {
    var bp = "";
    if ($.browser.webkit) {
      bp = "-webkit-";
    } else if ($.browser.mozilla) {
      bp = "-moz";
    }
    return bp;
  },

  isSupported: function() {
    return !($.browser.msie && parseInt($.browser.version) < 10)
  },

  nextTick: function(func) {
    setTimeout(func, 0);
  },

  clickUpOrTouch: function(func) {
    return 'ontouchstart' in window ? "touchstart": "mouseup";
  },

  import: function(script) {
    $.ajax({
      url: script,
      dataType: "script",
      async: false,
      success: function(){},
      error: function(){
        throw new Error("Could not load script " + script);
      }
    });
  }
};
