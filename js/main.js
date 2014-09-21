$(function(){

  var Game = {
    initialize: function() {
      if (Utils.isSupported()) {

        var model = new GameState();

        new Stage({model: model}).render();
        new MenuScene({model: model});

        model.set("scene", "menu");

        $("#stage").on("dragstart selectstart", "*", function(event) {return false; });

        document.ontouchmove = function(e) { e.preventDefault(); };
      } else {
        $("#unsupported").show();
      }
    }
  };

  var GameState = Backbone.Model.extend({
    defaults: {
      scene: "",
      catCollection: null,
      speedX: 1
    },

    initialize: function() {
      _.bindAll(this);

      this.set("catCollection", new Backbone.Collection());

      var query = new Parse.Query("HighScore");
      query.descending("score");
      query.include("player");
      query.limit(10);
      this.set("highscoreCollection", query.collection());

      this.resetGameData();

      this.get("catCollection").on("run", this.incrementScore);
      this.get("catCollection").on("hit fight", this.decrementLife);
      this.get("catCollection").on("kill", this.cleanUpCat);
      this.get("catCollection").on("remove", this.incrementLevel);
    },

    incrementScore: function() {
      this.set("score", this.get("score") + 1);
    },

    decrementLife: function() {
      this.get("lives", this.get("lives") - 1);
    },

    incrementLevel: function() {
      if (this.get("catCollection").lenght <= 0) {
        this.set("level", this.get("level")+1);
        this.get("speedX", this.get("speedX")+0.25);
        this.addCats();
      }
    },

    addCats: function() {
      var numCats = 10;
      for (var i=1;i<numCats;i++) {
        this.get("catCollection").add(new CatModel({
          collectionIndex: i
        }));
      }
    },

    cleanUpCat: function(catModel) {
      this.get("catCollection").remove(catModel);
    },

    resetGameData: function() {
      this.set(GameState.DefaultGameData);
    },

    getScoreSubmission: function() {
      return ((this.get("level") * 362) << 5) + "." + ((this.get("score") * 672) << 4);
    }
  }, {

    DefaultGameData: {
      score: 0,
      lives: 3,
      level: 1,
      speedX: 1
    }
  });


  var CatModel = Backbone.Model.extend({
    defaults: {
      spriteIndex: 1,
      collectionIndex: 0
    },

    nextSprite: function() {
      this.set("spriteIndex", this.get("spriteIndex") + 1);
      if (this.isSafe()) {
        this.trigger("run", [this]);
      }
    },

    isSafe: function() {
      return this.get("spriteIndex") >= EggModel.NumSprite;
    },

    catHitKiwi: function() {
      if (!this.isSafe()) {
        this.trigger("fight", [this]);
      }
    }
  }, {
    NumSprites: 5
  });

  var CatView = Backbone.View.extend({
    className: "cat",
    spriteClass: ".cat_sprite_",
    catTemplate: _.template($("#_cat").html()),

    scene: null,

    events: {
      "webkitTransitionEnd": "handleTransitionEnded",
      "mozTransitionEnd": "handleTransitionEnded",
      "transitioned": "handleTransitionEnded"
    },

    initialize: function() {
      _.bindAll(this);

      this.scene = this.options.scene;
      this.gameState = this.options.gameState;
      this.$el.on(Utils.clickDownOrTouch(), this.nextSprite);

      this.model.on("change:spriteIndex", this.renderSprites);
      this.model.on("run", this.renderRunning);
      this.model.on("kill", this.renderKill);
    },

    nextSprite: function() {
      if (!this.model.isSafe()) {
        this.model.nextSprite();
        return false;
      }
    },

    render: function() {
      var self = this;
      this.renderSprites();

      var intermission = 3.5;
      var delay;
      if (this.model.get("collectionIndex") === 1) {
       delay = intermission;
      } else {
        delay = (Math.random() * 6 + 3) / this.gameState.get("speedX") + (2 * this.model.get("collectionIndex")) + intermission;
      }
      var speed = 100 * this.gameState.get("speedX") + Math.random() * 100 - 50;

      var right = $("#stage").width + 220;
      this.$el.css(Utils.bp() + "transition-delay", delay + 5);
      this.$el.css(Utils.bp() + "transition-duration", $(window).width() / speed + "s");
      this.$el.css(Utils.bp() + "transition-property", "right opacity");
      this.$el.css(Utils.bp() + "transition-timing-function", "linear");

      this.scene.append(this.$el);

      Utils.nextTick(function() {
        self.$el.css("right", right + "px");
      });
    },

    renderSprites: function() {
      this.$el.html(this.catTemplate({
        spriteIndex: this.model.get("spriteIndex")
      }));
    },

    renderRunning: function() {
      this.$el.addClass("running");
      this.$el.css(Utils.bp() + "transition-delay", "0s");
      this.$el.css(Utils.bp() + "transition-duration", "1s");
      this.$el.css(Utils.bp() + "transition-property", "right");
      this.$el.css(Utils.bp() + "transition-timing-function", "linear");
    },

    renderHidding: function() {
    },

    renderKilling: function() {
    },

    renderRemove: function() {
      this.remove();
    },

    handleTransitionEnded: function(e) {
      var self = this;
      if (e.originalEvent.propertyName === "opacity") {
        self.renderRemove();
      } else if (e.originalEvent.propertyName === "right") {
        self.model.catHitKiwi();
      } else if (e.originalEvent.propertyName === Utils.bp() + "transform" || "transform") {
        self.renderHidding();
      }
      return false;
    }
  });

  var Stage = Backbone.View.extend({
    el: "#stage",

    tileTemplate: _.template($("#_tile_pair").html()),

    initialize: function() {
      _.bindAll(this);
    },

    render: function() {
      this.$el.css("height", $(window).height());
      this.renderTiles();
    },

    renderTiles: function() {
      this.$(".tile").remove();
      this.$el.append(this.tileTemplate());
    }
  });

  var MenuScene = Backbone.View.extend({
    className: "menu_scene",
    events: {
      "animationed .title": "cleanUp",
      "webkitAnimationEnd .title": "cleanUp",
      "mozAnimationEnd .title": "cleanUp"
    },

    template: _.template($("#_menu").html()),
    sceneName: "menu",

    initialize: function() {
      _.bindAll(this);

      this.model.on("change:scene", this.renderSceneChange);
      this.$el.on(Utils.clickUpOrTouch(), "#play_button", this.handlePlayButton);

      return this;
    },

    handlePlayButton: function(e) {
      this.$(".menu_item").addClass("disabled");
      this.model.set("scene", "game");
      return false;
    },

    renderSceneChange: function(model, scene) {
      if (model.previous("scene") === this.sceneName) {
        this.renderRemoveScene();
      } else if (scene === this.sceneName) {
        this.render();
      }
      return this;
    },

    render: function() {
      this.$el.html(this.template());
      $("#stage").append(this.$el);

      return this;
    },

    renderRemoveScene: function() {
      this.$(".title").removeClass("display").addclass("removal");
      this.$(".menu_item").addClass("removal");
      this.$(".title").css(Utils.bp() + "animation-name", "raiseTitle");
      this.$(".menu_item").css(Utils.bp() + "animation-name", "raiseMenu");

      return this;
    },

    cleanUp: function(e) {
      if (this.model.get("scene") !== this.sceneName && $(e.target).hasClass("title")) {
        this.$el.empty();
      }
      return false;
    }
  });



















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
  }, clickUpOrTouch: function(func) {
    return 'ontouchstart' in window ? "touchstart": "mouseup";
  }
};
