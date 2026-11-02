import axios from "axios";
import { apiUrl } from "../config/urls";

const API = apiUrl("expenses");

// Categories
export const getExpenseCategories = () => axios.get(`${API}/categories`);
export const createExpenseCategory = (data) => axios.post(`${API}/categories`, data);
export const updateExpenseCategory = (id, data) => axios.put(`${API}/categories/${id}`, data);
export const deleteExpenseCategory = (id) => axios.delete(`${API}/categories/${id}`);

export const getExpenses = (params) => axios.get(API, { params });
export const getExpenseById = (id) => axios.get(`${API}/${id}`);
export const createExpense = (data) => axios.post(API, data);
export const updateExpense = (id, data) => axios.put(`${API}/${id}`, data);
export const deleteExpense = (id) => axios.delete(`${API}/${id}`);
