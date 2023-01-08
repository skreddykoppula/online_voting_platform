"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Election extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static createElection({ electionName, adminID, publicurl }) {
      let createElection = this.create({
        electionName,
        publicurl,
        adminID,
      });
      return createElection;
    }

    static retriveElections(adminID) {
      let retriveElections = this.findAll({
        where: {
          adminID,
        },
        order: [["id", "ASC"]],
      });
      return retriveElections;
    }

    static retriveElection(id) {
      let retriveElection = this.findOne({
        where: {
          id,
        },
      });
      return retriveElection;
    }

    static associate(models) {
      // define association here
      Election.belongsTo(models.admin, {
        foreignKey: "adminID",
      });

      Election.hasMany(models.questions, {
        foreignKey: "electionId",
      });
    }
  }
  Election.init(
    {
      electionName: DataTypes.STRING,
      launched: DataTypes.BOOLEAN,
      ended: DataTypes.BOOLEAN,
      publicurl: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Election",
    }
  );
  return Election;
};
