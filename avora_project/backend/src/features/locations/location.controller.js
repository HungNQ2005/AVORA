'use strict';

const locationService = require('./location.service');
const { sendSuccess } = require('../../utils/responseHelper');

const getCities = async (req, res, next) => {
  try {
    const cities = await locationService.getCities();
    return sendSuccess(res, 200, 'Cities fetched successfully.', cities);
  } catch (err) {
    return next(err);
  }
};

const getDistricts = async (req, res, next) => {
  try {
    const districts = await locationService.getDistricts(req.query.city_id);
    return sendSuccess(res, 200, 'Districts fetched successfully.', districts);
  } catch (err) {
    return next(err);
  }
};

const getWards = async (req, res, next) => {
  try {
    const wards = await locationService.getWards(req.query.district_id);
    return sendSuccess(res, 200, 'Wards fetched successfully.', wards);
  } catch (err) {
    return next(err);
  }
};

module.exports = { getCities, getDistricts, getWards };
