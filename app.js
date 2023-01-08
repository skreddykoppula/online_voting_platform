const express = require("express");
const app = express();
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const { admin, Election, questions, Options } = require("./models");
const bodyParser = require("body-parser");
const connectEnsureLogin = require("connect-ensure-login");
const LocalStratergy = require("passport-local");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");

const { AsyncLocalStorage } = require("async_hooks");
const flash = require("connect-flash");
const saltRounds = 10;
app.use(bodyParser.json());

app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(cookieParser("Some secret String"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.use(
  session({
    secret: "my-super-secret-key-2837428907583420",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use((request, response, next) => {
  response.locals.messages = request.flash();
  next();
});
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  "user-local",
  new LocalStratergy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      admin
        .findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Password!!!" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Invalid Email-ID!!!!" });
        });
    }
  )
);

app.set("view engine", "ejs");
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));
passport.serializeUser((user, done) => {
  done(null, { id: user.id, case: user.case });
});

passport.deserializeUser((id, done) => {
  admin
    .findByPk(id.id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.post(
  "/session",
  passport.authenticate("user-local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (request, response) => {
    return response.redirect("/electionpage");
  }
);

app.get("/", (request, response) => {
  if (request.user) {
    return response.redirect("/electionpage");
  } else {
    response.render("index", {
      title: "Welcome To Online Voting Platform",
    });
  }
});

// index page
app.get(
  "/index",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("index", {
      title: "Online Voting platform",
      csrfToken: request.csrfToken(),
    });
  }
);

// signup page
app.get("/signup", (request, response) => {
  try {
    response.render("signup", {
      title: "Create your admin account",
      csrfToken: request.csrfToken(),
    });
  } catch (err) {
    console.log(err);
  }
});

//signout
app.get("/signout", (request, response, next) => {
  request.logout((error) => {
    if (error) {
      return next(error);
    }
    request.flash("success", "you have Signed out successfully!!");
    response.redirect("/");
  });
});

//login
app.get("/login", (request, response) => {
  if (request.user) {
    return response.redirect("/electionpage");
  }
  response.render("login", {
    title: "Login to yours admin account",
    csrfToken: request.csrfToken(),
  });
});

//post method for admin signup
app.post("/admin", async (request, response) => {
  if (request.body.firstName.length == 0) {
    request.flash("error", "Firstname can not be empty!");
    return response.redirect("/signup");
  }
  if (request.body.email.length == 0) {
    request.flash("error", "Email can not be empty!");
    return response.redirect("/signup");
  }
  if (request.body.password.length == 0) {
    request.flash("error", "Password can not be empty!");
    return response.redirect("/signup");
  }
  if (request.body.password.length <= 4) {
    request.flash("error", "Password length should be minimum of length 5!");
    return response.redirect("/signup");
  }
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await admin.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/");
      } else {
        request.flash("success", "Signup successfully!");
        response.redirect("/electionpage");
      }
    });
  } catch (error) {
    console.log(error);
    request.flash("error", "User already Exist with this given email!");
    return response.redirect("/signup");
  }
});

//homepage of admin
app.get(
  "/electionpage",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    let uid = await admin.findByPk(req.user.id);
    let name = uid.dataValues.firstName;
    try {
      const listOfElections = await Election.retriveElections(req.user.id);
      if (req.accepts("html")) {
        res.render("homepage", {
          title: "Online Voting admin Homepage",
          uid,
          userName: name,
          listOfElections,
          noOfElections: listOfElections.length,
        });
      } else {
        return res.json({ listOfElections });
      }
    } catch (error) {
      console.log(error);
      return res.status(422).json(error);
    }
  }
);

//election creation page
app.get(
  "/electionpage/addelection",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    return res.render("create-election", {
      title: "Create election",
      csrfToken: req.csrfToken(),
    });
  }
);

app.post(
  "/electionpage",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.body.electionName.length <= 5) {
      request.flash(
        "error",
        "Election name should contain atleast 5 characters"
      );
      return response.redirect("/electionpage/addelection");
    }
    if (request.body.publicurl.length < 3) {
      request.flash("error", "URL should contain atleast 3 characters");
      return response.redirect("/electionpage/addelection");
    }
    let spaceCheck =
      request.body.publicurl.includes(" ") ||
      request.body.publicurl.includes("\n") ||
      request.body.publicurl.includes("\t");
    if (spaceCheck == true) {
      request.flash("error", "URL can not contain any spaces");
      return response.redirect("/electionpage/addelection");
    }
    try {
      await Election.createElection({
        electionName: request.body.electionName,
        publicurl: request.body.publicurl,
        adminID: request.user.id,
      });
      return response.redirect("/electionpage");
    } catch (error) {
      console.log(error);
      request.flash("error", "URL is already in use");
      return response.redirect("/electionpage/addelection");
    }
  }
);

//election page
app.get(
  "/electionpage/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    console.log(req.params.id);
    try {
      const ele = await Election.findByPk(req.params.id);
      const ques = await await questions.retriveQuestions(req.params.id);
      res.render("launch-end", {
        title: "Election Page",
        id: req.params.id,
        ele,
        noOfQuestions: ques.length,
        csrfToken: req.csrfToken(),
      });
    } catch (err) {
      console.log(err);
      return res.status(422).json(err);
    }
  }
);

app.get(
  "/electionpage/:id/que/createque",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    res.render("create-question", {
      title: "Create Question",
      id: req.params.id,
      csrfToken: req.csrfToken(),
    });
  }
);

app.post(
  "/electionpage/:id/que/createque",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    if (req.body.questionname < 3) {
      req.flash("error", "Question should contain 3 characters!");
      return res.redirect(`/electionpage/${req.params.id}/que/createque`);
    }
    try {
      const question = await questions.createQuestion({
        electionId: req.params.id,
        questionname: req.body.questionname,
        description: req.body.description,
      });
      return res.redirect(`/electionpage/${req.params.id}/que/${question.id}`);
    } catch (err) {
      console.log(err);
      return res.status(422).json(err);
    }
  }
);

app.get(
  "/electionpage/:id/que",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const ques = await await questions.retriveQuestions(req.params.id);
    const election = await Election.findByPk(req.params.id);
    if (req.accepts("html")) {
      res.render("questions-page", {
        title: election.electionName,
        id: req.params.id,
        questions: ques,
        election: election,
        csrfToken: req.csrfToken(),
      });
    } else {
      return res.json({
        ques,
      });
    }
  }
);

module.exports = app;
