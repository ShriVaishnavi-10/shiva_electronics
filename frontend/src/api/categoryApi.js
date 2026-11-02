import axios from "axios";
import { apiUrl } from "../config/urls";

const API = apiUrl("categories");

export const getCategories = () => axios.get(API);
