const groups = [
  ['Veg Starters'],
  ['Non-Veg Starters'],
  ['Tandoor & Kebabs'],
  ['Indian Veg Curries'],
  ['Indian Non-Veg Curries'],
  ['Biryani & Rice'],
  ['Asian Wok & Noodles'],
  ['Indian Breads & Sides'],
  ['Soups'],
  ['Pizza & Pasta'],
  ['Desserts'],
  ['Beverages & Coolers'],
];

const rows = [
  ['Crispy Chilli Paneer|189', 'Veg Manchurian Dry|149', 'Veg Spring Rolls|129', 'Crispy Corn|139', 'Chilli Potato|129', 'Paneer 65|179', 'Gobi Manchurian|139'],
  ['Chicken 65|189', 'Chicken Lollipop|199', 'Chilli Chicken|199', 'Chicken Manchurian|189', 'Pepper Chicken|199', 'Garlic Chicken|209', 'Crispy Chicken Strips|179'],
  ['Tandoori Roti|25', 'Paneer Tikka|189', 'Malai Paneer Tikka|209', 'Chicken Tikka|219', 'Tandoori Chicken Half|249', 'Chicken Seekh Kebab|199', 'Tandoori Mushroom|169'],
  ['Paneer Butter Masala|199', 'Kadai Paneer|189', 'Palak Paneer|179', 'Mix Veg Curry|149', 'Dal Tadka|119', 'Dal Makhani|159', 'Chana Masala|129'],
  ['Butter Chicken|229', 'Kadai Chicken|219', 'Chicken Curry|189', 'Chicken Tikka Masala|239', 'Andhra Chicken Curry|209', 'Egg Masala|129', 'Pepper Chicken Gravy|219'],
  ['Veg Dum Biryani|149', 'Paneer Biryani|169', 'Egg Biryani|149', 'Chicken Dum Biryani|199', 'Chicken Fry Piece Biryani|229', 'Chicken 65 Biryani|229', 'Steamed Rice|79'],
  ['Veg Hakka Noodles|129', 'Chicken Hakka Noodles|169', 'Veg Schezwan Noodles|149', 'Chicken Schezwan Noodles|179', 'Veg Fried Rice|129', 'Chicken Fried Rice|169', 'Egg Fried Rice|139'],
  ['Plain Roti|20', 'Butter Roti|25', 'Plain Naan|39', 'Butter Naan|49', 'Garlic Naan|59', 'Plain Paratha|39', 'Curd Rice|89'],
  ['Tomato Soup|79', 'Sweet Corn Veg Soup|89', 'Hot & Sour Veg Soup|89', 'Manchow Veg Soup|99', 'Sweet Corn Chicken Soup|109', 'Hot & Sour Chicken Soup|109', 'Chicken Manchow Soup|119'],
  ['Classic Margherita Pizza|159', 'Farm Fresh Veg Pizza|189', 'Paneer Tikka Pizza|209', 'BBQ Chicken Pizza|229', 'Creamy Alfredo Veg Pasta|179', 'Arrabbiata Veg Pasta|159', 'Chicken Alfredo Pasta|219'],
  ['Gulab Jamun (2 pcs)|59', 'Double Chocolate Brownie|99', 'Brownie with Ice Cream|139', 'Vanilla Ice Cream|69', 'Chocolate Ice Cream|79', 'Caramel Custard|89', 'Chocolate Sundae|119'],
  ['Masala Chai|29', 'Filter Coffee|39', 'Cappuccino|89', 'Cold Coffee|99', 'Fresh Lime Soda|59', 'Mint Lemonade|79', 'AeroDine Signature Cooler|99'],
];

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const categories = groups.map(([name], index) => ({
  id: `category-${index + 1}`,
  name,
  slug: slugify(name),
  displayOrder: index + 1,
}));

export const menu = rows.flatMap((items, categoryIndex) =>
  items.map((item, index) => {
    const [name, price] = item.split('|');
    const vegetarian = categoryIndex === 0 || categoryIndex === 3 ||
      (categoryIndex === 2 && !/chicken/i.test(name)) ||
      (categoryIndex === 5 && /veg|paneer|rice/i.test(name)) ||
      (categoryIndex === 6 && /^Veg/i.test(name)) ||
      categoryIndex === 7 ||
      (categoryIndex === 8 && /Veg|Tomato/i.test(name)) ||
      (categoryIndex === 9 && /Veg|Margherita/i.test(name)) ||
      categoryIndex >= 10;
    return {
      id: `dish-${String(categoryIndex * 7 + index + 1).padStart(3, '0')}`,
      name,
      slug: slugify(name),
      categoryId: categories[categoryIndex].id,
      category: categories[categoryIndex].name,
      description: `${name}, freshly prepared to order with AeroDine's signature seasoning.`,
      priceInPaise: Number(price) * 100,
      vegetarian,
      isAvailable: true,
      isFeatured: [0, 5, 10].includes(categoryIndex) && index === 0,
    };
  }),
);

export const formatPrice = (paise) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(paise / 100);