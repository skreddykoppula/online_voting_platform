"use strict";
const { Model, Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Options extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static createOption({ option, questionId }) {
      let createOption = this.create({
        option,
        questionId,
      });
      return createOption;
    }

    static retriveOptions(questionId) {
      let retriveOptions = this.findAll({
        where: {
          questionId,
        },
        order: [["id", "ASC"]],
      });
      return retriveOptions;
    }

    static retriveOption(id) {
      let retriveOption = this.findOne({
        where: {
          id,
        },
      });
      return retriveOption;
    }

    static deleteOption(id) {
      let deleteOption = this.destroy({
        where: {
          id,
        },
      });
      return deleteOption;
    }

    static editOption({ option, id }) {
      let editOption = this.update(
        {
          option,
        },
        {
          where: {
            id,
          },
        }
      );
      return editOption;
    }

    static associate(models) {
      // define association here
      Options.belongsTo(models.questions, {
        foreignKey: "questionId",
        onDelete: "CASCADE",
      });
    }
  }
  Options.init(
    {
      option: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Options",
    }
  );
  return Options;
};
