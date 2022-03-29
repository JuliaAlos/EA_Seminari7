import express, { Request, Response } from "express";
import { authJwt } from "../middlewares/index.js";
import { ClubModel } from "../models/club.js";
import User from '../models/User';

async function getClubs(req: Request, res: Response) {
  await ClubModel.find().populate('admin', 'userName mail')
    .sort('-createdAt')
    .then(async clubs => {
      res.status(200).send(clubs);
    }).catch(error => {
      res.status(400).send({ message: `Error get all clubs: ${error}` });
    });
}

async function getClub(req: Request, res: Response) {
  const { idClub } = req.params;
  await ClubModel.findById(idClub)
    .populate('admin', 'userName mail')
    .populate('usersList', 'userName mail')
    .then(club => {
      if (club) {
        return res.status(200).send(club);
      }
      res.status(400).send({ message: `Club '${idClub}' not found` });
    }).catch(error => {
      res.status(400).send({ message: `Error get club '${idClub}': ${error}` });
    });
}

async function newClub(req: Request, res: Response) {
  const { clubName, idAdmin, description, category } = req.body;

  if (await ClubModel.findOne({ name: clubName })) {
    return res.status(406).send({ message: "Club name already in the system." });
  }

  const adminUser = await User.findById(idAdmin)
    .then(user => {
      if (!user) {
        return res.status(404).send({ message: "User not found." });
      }
      return user;
    }).catch(error => {
      return res.status(400).send({ message: `Error post club: ${error}` });
    });

  const newClub = new ClubModel({ name: clubName, description: description, admin: adminUser, usersList: [adminUser], category: category });
  const club = await newClub.save();

  await User.findOneAndUpdate(
    { _id: idAdmin },
    { $addToSet: { clubs: club } }).then(resUser => {
      if (!resUser) {
        return res.status(404).send({ message: "Error add user to club." });
      }
      res.status(200).send({ message: `Club successful created ${clubName}` });
    }).catch(error => {
      res.status(400).send({ message: `Error subscribe to club ${error}` });
    });
}

async function deleteClub(req: Request, res: Response) {
  const { idClub } = req.params;
  await ClubModel.findByIdAndDelete(idClub)
    .then(club => {
      if (club) {
        User.updateMany(
          { _id: club.usersList, disabled: false },
          { $pull: { clubs: club._id } },
          { safe: true }
        ).catch(error => {
          res.status(500).send({ message: `Error deleting user from the club ${error}` });
        });
        return res.status(200).send({ message: "Deleted!" });
      }
      res.status(404).send({ message: "The club doesn't exist!" });
    }).catch(error => {
      res.status(400).send({ message: `Error delete club ${error}` });
    });
}

async function subscribeUserClub(req: Request, res: Response) {
  const { idUser, idClub } = req.body;
  const club = await ClubModel.findById(idClub);
  const user = await User.findById(idUser);
  if (!club || !user) {
    return res.status(404).send({ message: `Club ${idClub} or user ${idUser} not found` });
  }

  await ClubModel.findOneAndUpdate(
    { _id: club.id },
    { $addToSet: { usersList: user } }).then(resClub => {
      if (!resClub) {
        return res.status(404).send({ message: "Error add user to club." });
      }
    }).catch(error => {
      return res.status(400).send({ message: `Error subscribe to club ${error}` });
    });

  await User.findOneAndUpdate(
    { _id: user.id },
    { $addToSet: { clubs: club } }).then(resUser => {
      if (!resUser) {
        return res.status(404).send({ message: "Error add user to club." });
      }
      res.status(200).send({ message: `User ${user.name} is now subscribed to ${club.name}` });
    }).catch(error => {
      res.status(400).send({ message: `Error subscribe to club ${error}` });
    });
}

async function unsubscribeUserClub(req: Request, res: Response) {
  const { idUser, idClub } = req.body;

  await ClubModel.findOneAndUpdate(
    { _id: idClub },
    { $pull: { usersList: idUser } },
    { safe: true }
  ).then(club => {
    if (!club) {
      return res.status(404).send({ message: "Club not found" });
    }
  }).catch(error => {
    return res.status(400).send({ message: `Error unsubscribe to club ${error}` });
  });

  await User.findOneAndUpdate(
    { _id: idUser },
    { $pull: { clubs: idClub } },
    { safe: true }
  ).then(user => {
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    res.status(200).send({ message: `User ${user.name} stop follow club ${idClub}` });
  }).catch(error => {
    res.status(400).send({ message: `Error unsubscribe to club ${error}` });
  });
}

let router = express.Router();

router.get("/", getClubs);
router.get("/:idClub", authJwt.verifyToken, getClub);
router.post("/", [authJwt.verifyToken, authJwt.isModerator], newClub);
router.delete("/:idClub", [authJwt.verifyToken, authJwt.isAdmin], deleteClub);
router.put("/", authJwt.verifyToken, subscribeUserClub);
router.put("/unsubscribe", authJwt.verifyToken, unsubscribeUserClub);
export default router;
