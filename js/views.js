var KiwiView = Backbone.View.extend({
  className: "kiwi",
  spriteClass: ".kiwi_sprite_",
  kiwiTemplate: _.template($("#_kiwi").html()),

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

    this.model.on("change:spriteIndex", this.renderSprites);
  },

  render: function() {
    var self = this;
    var right = $("#stage").width() / 2;
    var top = $("#stage").height() - 200;
    this.$el.css("top", top + "px");
    this.$el.css("right", right + "px");
    this.scene.append(this.$el);
  },

  handleTransitionEnded: function(e) {
    var self = this;
    if (e.originalEvent.propertyName === "opacity") {
      self.renderRemove();
    } else if (e.originalEvent.propertyName === "top") {
      self.model.catHitKiwi();
    } else if (e.originalEvent.propertyName === Utils.bp() + "transform" || "transform") {
      self.renderHidding();
    }
    return false;
  }
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
    this.$el.on(Utils.clickUpOrTouch(), this.nextSprite);

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

    var right = $("#stage").width() + 220;
    var top = $("#stage").height() - 200;

    this.$el.css(Utils.bp() + "transition-delay", delay + 5);
    this.$el.css(Utils.bp() + "transition-duration", $(window).width() / speed + "s");
    this.$el.css(Utils.bp() + "transition-property", "right opacity");
    this.$el.css(Utils.bp() + "transition-timing-function", "linear");
    this.$el.css("top", top + "px");

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
    } else if (e.originalEvent.propertyName === "top") {
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
    "animationend .title": "cleanUp",
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
    this.$(".title").removeClass("display").addClass("removal");
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

var GameScene = Backbone.View.extend({
  className: "game_scene",
  events: {
    "animationend": "cleanUp",
    "webkitAnimationEnd": "cleanUp",
    "mozAnimationEnd": "cleanUp"
  },

  scoreTemplate: _.template($("#_game_score").html()),
  levelTemplate: _.template($("#_game_level").html()),
  sceneName: "game",

  initialize: function() {
    _.bindAll(this);
    this.catViews = [];

    this.$el.on(Utils.clickUpOrTouch(), ".back_button", this.handleBackButton);

    this.model.on("change:scene", this.renderSceneChange);
    this.model.get("catCollection").on("add", this.renderAddCat);
    this.model.get("kiwiCollection").on("add", this.renderAddKiwi);
    this.model.on("change:score", this.renderScore);
    this.model.on("change:level", this.renderLevel);
    this.model.on("change:level", this.renderLevelLable);
  },

  handleBackButton: function(e) {
    this.$(".back_button").addClass("disabled");
    this.model.set("scene", "menu");
  },

  renderSceneChange: function(model, scene) {
    if (model.previous("scene") === this.sceneName) {
      this.renderRemoveScene();
    } else if (scene === this.sceneName) {
      this.render();
    }
    console.log("RenderSceneChange GameScene");
    return this;
  },

  render: function() {
    var self = this;

    this.model.resetGameData();
    this.$("#hud").remove();
    this.$el.append("<div id='hud'></div>");

    this.renderLevel();
    setTimeout(function(){self.renderLevelLable();}, 1200);
    this.renderScore();
    this.renderBackButton();
    this.renderCats();
    this.renderKiwi();

    if ($("#stage ." + this.className).length <= 0) {
      $("#stage").append(this.$el);
    }

    return this;
  },

  renderLevel: function() {
   if (this.$("#game_level").length > 0) {
     this.$("#game_level").replaceWith(this.levelTemplate({ level: this.model.get("level") }));
   } else {
     this.$("#hud").append(this.levelTemplate({ level: this.model.get("level") }));
   }

   return this;
  },

  renderLevelLable: function() {
    this.$el.append("<p class='level_label'>LEVEL " + this.model.get("level") + "<br>KILL</p>");
    setTimeout(function(){ this.$(".level_label").addClass("removal"); }, 3000);
    setTimeout(function(){ this.$(".level_label").remove(); }, 3300);

    return this;
  },

  renderScore: function() {
    if (this.$("#game_score").length > 0) {
      this.$("#game_score").replaceWith(this.scoreTemplate({ score: this.model.get("score") }));
    } else {
      this.$("#hud").append(this.scoreTemplate({ score: this.model.get("score") }));
    }

    return this;
  },

  renderBackButton: function() {
    if (this.$(".back_button").length > 0) {
      this.$(".back_button").replaceWith("<div class='back_button'>X</div>");
    } else {
      this.$el.append("<div class='back_button'>X</div>");
    }

    return this;
  },

  renderCats: function() {
    this.model.addCats();
    return this;
  },

  renderKiwi: function() {
    this.model.addKiwi();
    return this;
  },

  renderAddCat: function(catModel, collection, options) {
    var catView = new CatView({
      model: catModel,
      gameState: this.model,
      scene: this.$el
    });

    catView.render();
    this.catViews.push(catView);
    return this;
  },

  renderAddKiwi: function(kiwiModel, collection, options) {
    var kiwiView = new KiwiView({
      model: kiwiModel,
      gameState: this.model,
      scene: this.$el
    });

    kiwiView.render();
    return this;
  },

  renderRemoveScene: function() {
    this.$(".back_button").css(Utils.bp() + "animation-name", "xRaise");
    this.$("#hud p").css(Utils.bp() + "animation-name", "removeHUD");
    this.$(".cat").css(Utils.bp() + "transition-duration", "0.3s");

    _.each(this.catViews, function(catView) {
      catView.renderRemove();
    });

    kiwiView.renderRemove();

    this.model.get("catCollection").reset();
    this.model.get("kiwiCollection").reset();

    return this;
  },

  cleanUp: function(e) {
    if (this.model.get("scene") !== this.sceneName && $(e.target).hasClass("back_button")) {
      this.$el.empty();
    }

    return false;
  }
});


