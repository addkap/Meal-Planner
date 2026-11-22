// Built-in dinners. Original recipes. Meat and fish are weighed raw; grains and lentils dry; canned beans drained.
// Red meat dishes keep the meat to about 3 oz (raw) per serving, Blue Zone style.
import { cards } from './define';

export const DINNERS = cards('dinner', [
  // ---------------------------------------------------------------- fish and seafood
  {
    name: 'Sheet-Pan Lemon Salmon with Asparagus and Potatoes',
    serves: 4, active: 15, total: 40, protein: 'salmon',
    ing: ['1 1/4 lb salmon', '1 1/2 lb potato, quartered', '1 bunch asparagus, trimmed', '3 tbsp olive_oil', '1 lemon, sliced', '3 clove garlic, minced', '1 tsp oregano', '2 tbsp dill, chopped', '1/4 tsp salt', '1/4 tsp black_pepper'],
    steps: [
      'Heat the oven to 425°F. Toss the potatoes with 1 tbsp oil and roast 15 minutes.',
      'Push the potatoes aside. Add the asparagus and salmon, brush with the remaining oil mixed with garlic and oregano, and top the salmon with lemon slices.',
      'Roast 12 to 15 minutes, until the salmon flakes. Season and sprinkle with dill.',
    ],
  },
  {
    name: 'Salmon over Lentils and Spinach',
    serves: 4, active: 20, total: 40, protein: 'salmon',
    ing: ['1 lb salmon', '1 cup lentils, rinsed', '1 tbsp olive_oil', '1 shallot, minced', '1 carrot, finely diced', '1 celery, finely diced', '5 cup spinach', '2 tbsp red_wine_vinegar', '1 tsp mustard', '1 tbsp olive_oil', '1/2 tsp thyme'],
    steps: [
      'Simmer the lentils in water 20 minutes until tender. Drain.',
      'Cook the shallot, carrot and celery in 1 tbsp oil 5 minutes. Stir in the lentils, thyme, vinegar and mustard, then the spinach until wilted.',
      'Season the salmon and cook skin-side down in a hot pan with the remaining oil 5 minutes, flip and cook 3 minutes more.',
      'Serve the salmon on the lentils.',
    ],
  },
  {
    name: 'Honey-Mustard Salmon with Quinoa and Broccoli',
    serves: 4, active: 15, total: 25, protein: 'salmon',
    ing: ['1 1/4 lb salmon', '2 tbsp mustard', '1 tbsp honey', '1 tbsp olive_oil', '1 cup quinoa, rinsed', '1 head broccoli, florets', '1 tbsp lemon_juice', '1 tbsp olive_oil'],
    steps: ['Heat the oven to 425°F. Simmer the quinoa in 2 cups water, covered, 15 minutes.', 'Mix the mustard, honey and 1 tbsp oil and brush over the salmon. Toss the broccoli with the rest of the oil.', 'Roast the salmon and broccoli on one pan 12 to 14 minutes. Finish with lemon juice.'],
  },
  {
    name: 'Salmon with Roasted Fennel, White Beans and Olives',
    serves: 4, active: 20, total: 55, protein: 'salmon',
    ing: ['1 1/4 lb salmon', '2 fennel, sliced', '1 medium onion, sliced', '2 tbsp olive_oil', '1 can white_beans, rinsed', '1 pint cherry_tomatoes', '1/3 cup olives', '1 tsp lemon_zest', '2 tbsp parsley, chopped', '4 slice sourdough'],
    steps: [
      'Heat the oven to 400°F. Roast the fennel and onion with the oil for 25 minutes.',
      'Stir in the beans, tomatoes and olives and roast 10 minutes more.',
      'Nestle the salmon on top and roast 12 to 15 minutes until it flakes.',
      'Finish with lemon zest and parsley. Serve with toasted bread.',
    ],
  },
  {
    name: 'Cod Baked in Tomatoes with Olives and Capers',
    serves: 4, active: 10, total: 25, protein: 'white-fish',
    ing: ['1 1/4 lb cod', '1 tbsp olive_oil', '3 clove garlic, sliced', '1 can diced_tomatoes', '1/4 cup olives, halved', '1 tbsp capers', '1/2 tsp oregano', '1 pinch red_pepper_flakes', '2 tbsp parsley, chopped', '1 cup couscous', '4 cup spinach'],
    steps: [
      'Heat the oven to 400°F. In an oven-safe skillet warm the oil and garlic 1 minute, then add the tomatoes, olives, capers, oregano and pepper flakes.',
      'Nestle in the cod and bake 12 to 15 minutes, until it flakes.',
      'Meanwhile pour 1 1/4 cups boiling water over the couscous, cover 5 minutes; stir in the spinach to wilt.',
      'Sprinkle the fish with parsley and serve over the couscous.',
    ],
  },
  {
    name: 'Mediterranean Fish and Shrimp Stew',
    serves: 6, active: 25, total: 60, protein: 'white-fish',
    ing: ['2 tbsp olive_oil', '1 medium onion, diced', '1 fennel, diced', '1 red_pepper, diced', '4 clove garlic, minced', '1 tsp paprika', '1 can crushed_tomatoes', '4 cup veg_broth', '1 lb potato, diced', '1 lb halibut, chunks', '1/2 lb shrimp', '1/4 cup parsley, chopped', '1 lemon', '6 slice sourdough'],
    steps: [
      'Cook the onion, fennel and pepper in the oil 8 minutes. Add the garlic and paprika for 1 minute.',
      'Add the tomatoes, broth and potatoes and simmer 25 minutes until the potatoes are tender.',
      'Add the fish and shrimp and simmer gently 5 to 6 minutes until just cooked.',
      'Stir in parsley and lemon juice. Serve with toasted bread.',
    ],
  },
  {
    name: 'Tilapia Tacos with Cabbage Slaw',
    serves: 4, active: 20, total: 25, protein: 'white-fish',
    ing: ['1 1/4 lb tilapia', '1 tsp chili_powder', '1/2 tsp cumin', '1 tbsp olive_oil', '3 cup cabbage, shredded', '1/2 cup greek_yogurt', '2 tbsp lime_juice', '1/4 cup cilantro, chopped', '8 corn_tortilla', '1 avocado, sliced', '1 can black_beans, rinsed'],
    steps: [
      'Stir the yogurt with half the lime juice; toss half of it with the cabbage and cilantro.',
      'Season the fish with chili powder and cumin and cook in the oil 3 minutes per side.',
      'Warm the beans and the tortillas.',
      'Fill tortillas with fish, slaw and avocado. Serve with beans and the rest of the lime yogurt.',
    ],
  },
  {
    name: 'Lemon-Herb Halibut with Couscous and Zucchini',
    serves: 4, active: 20, total: 25, protein: 'white-fish',
    ing: ['1 1/4 lb halibut', '2 tbsp olive_oil', '2 zucchini, sliced', '1 cup couscous', '1 can chickpeas, rinsed', '2 tbsp lemon_juice', '1 tsp lemon_zest', '2 tbsp parsley, chopped', '2 tbsp mint, chopped', '1 clove garlic, minced'],
    steps: [
      'Pour 1 1/4 cups boiling water over the couscous, cover 5 minutes, fluff and stir in the chickpeas.',
      'Cook the zucchini in 1 tbsp oil 5 minutes until browned.',
      'Season the halibut and cook in the remaining oil 4 minutes per side.',
      'Mix the lemon juice, zest, garlic and herbs and spoon over the fish. Serve with couscous and zucchini.',
    ],
  },
  {
    name: 'Garlic Shrimp with White Beans and Spinach',
    serves: 4, active: 15, total: 20, protein: 'shrimp',
    ing: ['1 lb shrimp', '2 tbsp olive_oil', '4 clove garlic, sliced', '1 pinch red_pepper_flakes', '2 can white_beans, rinsed', '1 pint cherry_tomatoes, halved', '6 cup spinach', '2 tbsp lemon_juice', '2 tbsp parsley, chopped', '4 slice sourdough'],
    steps: ['Warm the oil, garlic and pepper flakes in a large skillet 1 minute.', 'Add the shrimp and cook 2 minutes per side until pink; set aside.', 'Add the tomatoes and beans for 4 minutes, then the spinach until wilted.', 'Return the shrimp, add lemon juice and parsley. Serve with toasted bread.'],
  },
  {
    name: 'Shrimp and Vegetable Whole-Wheat Pasta',
    serves: 4, active: 20, total: 25, protein: 'shrimp',
    ing: ['8 oz ww_pasta', '1 lb shrimp', '2 tbsp olive_oil', '3 clove garlic, minced', '1 zucchini, diced', '1 red_pepper, diced', '1 pint cherry_tomatoes, halved', '3 cup spinach', '1/4 cup basil, torn', '1/4 cup parmesan', '2 tbsp lemon_juice'],
    steps: ['Cook the pasta; save 1/2 cup of the water.', 'Cook the shrimp in 1 tbsp oil 2 minutes per side; set aside.', 'Cook the garlic, zucchini and pepper in the remaining oil 4 minutes, add the tomatoes for 3 minutes.', 'Toss with pasta, spinach, shrimp, lemon, basil, Parmesan and a splash of pasta water.'],
  },
  {
    name: 'Shrimp and Chickpea Brown Rice Paella',
    serves: 6, active: 25, total: 65, protein: 'shrimp',
    ing: ['2 tbsp olive_oil', '1 medium onion, diced', '1 red_pepper, sliced', '4 clove garlic, minced', '2 tsp paprika', '1/2 tsp turmeric', '1 1/2 cup brown_rice', '1 can diced_tomatoes', '4 cup chicken_broth', '1 can chickpeas, rinsed', '1 lb shrimp', '1 cup peas', '1 lemon, wedges', '1/4 cup parsley, chopped'],
    steps: [
      'In a wide pan cook the onion and pepper in the oil 6 minutes. Add the garlic, paprika and turmeric for 1 minute.',
      'Stir in the rice, tomatoes, broth and chickpeas. Bring to a boil, cover and simmer 40 minutes without stirring.',
      'Scatter the shrimp and peas on top, cover and cook 8 minutes until the shrimp are pink.',
      'Rest 5 minutes. Serve with lemon wedges and parsley.',
    ],
  },
  {
    name: 'Baked Trout with Dill and Roasted Potatoes',
    serves: 2, active: 15, total: 40, protein: 'trout',
    ing: ['12 oz trout', '3/4 lb potato, halved', '2 cup green_beans, trimmed', '1 1/2 tbsp olive_oil', '1 lemon, sliced', '2 tbsp dill, chopped', '1 clove garlic, minced', '1 pinch salt'],
    steps: ['Heat the oven to 425°F. Roast the potatoes with 1 tbsp oil 20 minutes.', 'Add the green beans to the pan. Lay the trout on top with garlic, lemon slices, dill and the rest of the oil.', 'Roast 12 minutes until the fish flakes.'],
  },
  {
    name: 'Mussels in Garlicky Tomato Broth',
    serves: 4, active: 20, total: 25, protein: 'shellfish',
    ing: ['3/4 lb mussels, meat weight (buy about 3 lb in the shell)', '2 tbsp olive_oil', '1 shallot, minced', '4 clove garlic, sliced', '1 can diced_tomatoes', '1 cup veg_broth', '1 pinch red_pepper_flakes', '1/3 cup parsley, chopped', '6 slice sourdough', '4 cup greens', '1 tbsp balsamic'],
    steps: [
      'Warm the oil, shallot and garlic in a large pot 2 minutes.',
      'Add the tomatoes, broth and pepper flakes and bring to a boil.',
      'Add the mussels, cover and cook 5 to 7 minutes, shaking the pot, until they open. Throw away any that stay closed.',
      'Sprinkle with parsley. Serve with toasted bread for the broth and a green salad with balsamic.',
    ],
  },
  {
    name: 'Seared Scallops with Pea and Barley Risotto',
    serves: 4, active: 30, total: 55, protein: 'shellfish',
    ing: ['1 lb scallops', '1 tbsp olive_oil', '1 shallot, minced', '1 cup barley', '3 cup veg_broth', '2 cup water', '2 cup peas', '1/3 cup parmesan', '1 tsp lemon_zest', '2 tbsp mint, chopped', '1 tbsp olive_oil', '4 cup arugula'],
    steps: [
      'Cook the shallot in 1 tbsp oil 2 minutes. Add the barley and stir 1 minute.',
      'Add the broth and water a cup at a time, simmering and stirring often, for about 40 minutes until creamy and tender.',
      'Stir in the peas, Parmesan and lemon zest.',
      'Pat the scallops very dry and sear in the remaining oil 2 minutes per side. Serve over the barley with arugula and mint.',
    ],
  },

  // ---------------------------------------------------------------- poultry
  {
    name: 'Lemon Chicken with Chickpeas and Olives',
    serves: 4, active: 20, total: 25, protein: 'chicken',
    ing: ['1 lb chicken_breast, thin cutlets', '2 tbsp olive_oil', '1 tsp oregano', '3 clove garlic, sliced', '1 can chickpeas, rinsed', '1/3 cup olives', '1 cup chicken_broth', '3 tbsp lemon_juice', '4 cup spinach', '2 ww_pita'],
    steps: [
      'Season the chicken with oregano and cook in 1 tbsp oil 3 to 4 minutes per side. Set aside.',
      'Add the rest of the oil, the garlic, chickpeas and olives to the pan for 2 minutes.',
      'Add the broth and lemon juice and simmer 3 minutes. Stir in the spinach and return the chicken.',
      'Serve with warm pita for the sauce.',
    ],
  },
  {
    name: 'Greek Chicken Sheet Pan with Potatoes and Green Beans',
    serves: 4, active: 15, total: 50, protein: 'chicken',
    ing: ['1 1/4 lb chicken_thigh', '1 1/2 lb potato, wedges', '3 cup green_beans', '1 red_onion, wedges', '3 tbsp olive_oil', '3 tbsp lemon_juice', '3 clove garlic, minced', '2 tsp oregano', '1/4 cup feta, crumbled'],
    steps: ['Heat the oven to 425°F. Whisk the oil, lemon, garlic and oregano.', 'Toss the potatoes and onion with half the dressing and roast 20 minutes.', 'Add the chicken and green beans tossed in the rest and roast 25 minutes until the chicken reaches 165°F.', 'Sprinkle with feta.'],
  },
  {
    name: 'Chicken Souvlaki Bowls with Brown Rice',
    serves: 4, active: 25, total: 50, protein: 'chicken',
    ing: ['1 lb chicken_breast, cubed', '2 tbsp olive_oil', '2 tbsp lemon_juice', '2 tsp oregano', '2 clove garlic, minced', '1 cup brown_rice', '1 cup greek_yogurt', '1 cucumber, diced', '2 tomato, diced', '1/2 red_onion, sliced', '1/4 cup olives', '2 cup romaine'],
    steps: [
      'Cook the rice (about 40 minutes).',
      'Toss the chicken with oil, lemon, oregano and garlic and let stand while the rice cooks.',
      'Thread onto skewers or cook in a hot pan 8 to 10 minutes, turning, until cooked through.',
      'Build bowls with rice, lettuce, vegetables, olives, chicken and a spoon of yogurt.',
    ],
  },
  {
    name: 'Braised Chicken Thighs with Tomatoes and White Beans',
    serves: 6, active: 25, total: 75, protein: 'chicken', tags: ['batch-friendly'],
    ing: ['1 1/2 lb chicken_thigh', '2 tbsp olive_oil', '1 medium onion, diced', '2 carrot, diced', '4 clove garlic, minced', '1 tsp rosemary', '1 can crushed_tomatoes', '2 can white_beans, rinsed', '1 cup chicken_broth', '5 cup kale, chopped', '1/4 cup parsley, chopped', '3 slice sourdough'],
    steps: [
      'Brown the chicken in the oil in a Dutch oven 4 minutes per side. Set aside.',
      'Cook the onion and carrot 6 minutes, add the garlic and rosemary for 1 minute.',
      'Add the tomatoes, broth and beans, return the chicken, cover and simmer 40 minutes.',
      'Stir in the kale for 8 minutes. Sprinkle with parsley and serve with bread.',
    ],
  },
  {
    name: 'Chicken and Vegetable Stir-Fry with Brown Rice',
    serves: 4, active: 20, total: 45, protein: 'chicken',
    ing: ['1 lb chicken_breast, sliced', '1 cup brown_rice', '1 tbsp olive_oil', '1 head broccoli, florets', '1 red_pepper, sliced', '2 carrot, sliced', '2 clove garlic, minced', '1 tbsp ginger, grated', '3 tbsp soy_sauce', '1 tbsp honey', '2 tbsp cashews', '3 scallion, sliced'],
    steps: ['Cook the rice (about 40 minutes).', 'Stir-fry the chicken in the oil 5 minutes until cooked; set aside.', 'Stir-fry the vegetables 5 minutes with a splash of water. Add the garlic and ginger for 1 minute.', 'Return the chicken with the soy sauce and honey. Top with cashews and green onions.'],
  },
  {
    name: 'Chicken, Spinach and Mushroom Whole-Wheat Pasta',
    serves: 4, active: 20, total: 25, protein: 'chicken',
    ing: ['8 oz ww_pasta', '12 oz chicken_breast, sliced', '1 tbsp olive_oil', '1 package mushrooms, sliced', '3 clove garlic, minced', '1/2 cup ricotta', '5 cup spinach', '1/3 cup parmesan', '1 tsp lemon_zest', '1 pinch black_pepper'],
    steps: ['Cook the pasta; save 1 cup of the water.', 'Cook the chicken in the oil 5 minutes; add the mushrooms and garlic for 5 minutes.', 'Stir in the spinach, then the pasta, ricotta, Parmesan, lemon zest and enough pasta water to make it creamy.'],
  },
  {
    name: 'Moroccan Chicken and Vegetable Tagine',
    serves: 6, active: 25, total: 70, protein: 'chicken', tags: ['batch-friendly'],
    ing: ['1 1/2 lb chicken_thigh', '2 tbsp olive_oil', '1 medium onion, diced', '3 clove garlic, minced', '2 tsp cumin', '1 tsp cinnamon', '1 tsp turmeric', '1 tsp ground_ginger', '1 can diced_tomatoes', '2 cup chicken_broth', '1 butternut, cubed', '1 can chickpeas, rinsed', '1/3 cup dried_apricots, chopped', '1 1/2 cup couscous', '1/4 cup cilantro, chopped'],
    steps: [
      'Brown the chicken in the oil 4 minutes per side. Set aside.',
      'Cook the onion 6 minutes, add the garlic and spices for 1 minute.',
      'Add the tomatoes, broth, squash, chickpeas and apricots. Return the chicken, cover and simmer 35 minutes.',
      'Pour 2 cups boiling water over the couscous, cover 5 minutes. Serve the tagine over couscous with cilantro.',
    ],
  },
  {
    name: 'Turkey Meatballs with Marinara and Whole-Wheat Spaghetti',
    serves: 6, active: 30, total: 50, protein: 'turkey', tags: ['batch-friendly', 'freezer'],
    ing: ['1 lb ground_turkey', '1/2 cup oats', '1 large egg', '1/4 cup parmesan', '2 clove garlic, minced', '1/4 cup parsley, chopped', '1 tsp oregano', '1 jar marinara', '2 zucchini, diced', '12 oz ww_pasta', '1 tbsp olive_oil', '6 cup spinach'],
    steps: [
      'Heat the oven to 400°F. Mix the turkey, oats, egg, Parmesan, garlic, parsley and oregano. Roll into 24 balls.',
      'Place on an oiled sheet and bake 18 minutes.',
      'Simmer the zucchini in the marinara 10 minutes, then add the meatballs. Cook the pasta, adding the spinach for the last minute.',
      'Serve the pasta with sauce and meatballs.',
    ],
  },
  {
    name: 'Turkey and Bean Chili',
    serves: 6, active: 20, total: 60, protein: 'turkey', tags: ['batch-friendly', 'freezer'],
    ing: ['1 lb ground_turkey', '1 tbsp olive_oil', '1 medium onion, diced', '2 red_pepper, diced', '4 clove garlic, minced', '2 tbsp chili_powder', '2 tsp cumin', '1 can crushed_tomatoes', '1 can kidney_beans, rinsed', '1 can black_beans, rinsed', '2 cup chicken_broth', '1 cup corn', '1/2 cup greek_yogurt', '1/4 cup cilantro, chopped'],
    steps: [
      'Brown the turkey in the oil 6 minutes. Add the onion and peppers for 6 minutes.',
      'Stir in the garlic and spices for 1 minute.',
      'Add the tomatoes, beans, broth and corn and simmer 35 minutes.',
      'Serve topped with yogurt and cilantro.',
    ],
  },
  {
    name: 'Turkey-Stuffed Bell Peppers',
    serves: 4, active: 25, total: 65, protein: 'turkey',
    ing: ['4 red_pepper, halved', '12 oz ground_turkey', '1/2 cup brown_rice', '1 tbsp olive_oil', '1 medium onion, diced', '2 clove garlic, minced', '1 zucchini, diced', '1 can diced_tomatoes', '1 tsp oregano', '1/2 cup mozzarella, shredded', '4 cup greens', '1 tbsp balsamic'],
    steps: [
      'Cook the rice (about 35 minutes). Heat the oven to 375°F.',
      'Brown the turkey with the onion in the oil 8 minutes. Add the garlic, zucchini, tomatoes and oregano and simmer 5 minutes. Stir in the rice.',
      'Fill the pepper halves, top with mozzarella, cover with foil and bake 25 minutes.',
      'Serve with a green salad with balsamic.',
    ],
  },

  // ---------------------------------------------------------------- red meat (small portions)
  {
    name: 'Beef and Vegetable Kebabs with Tzatziki',
    serves: 4, active: 25, total: 45, protein: 'beef',
    ing: ['12 oz sirloin, cubed', '1 red_pepper, chunks', '1 zucchini, chunks', '1 red_onion, chunks', '2 tbsp olive_oil', '2 tbsp lemon_juice', '1 tsp oregano', '1 cup greek_yogurt', '1/2 cucumber, grated', '1 clove garlic, minced', '1 cup bulgur', '2 tbsp parsley, chopped'],
    steps: [
      'Toss the beef and vegetables with oil, lemon and oregano; let stand 15 minutes.',
      'Pour 2 cups boiling water over the bulgur, cover 15 minutes and fluff with parsley.',
      'Squeeze the cucumber dry and mix with the yogurt and garlic.',
      'Thread the skewers and grill or broil 8 to 10 minutes, turning. Serve with bulgur and tzatziki.',
    ],
  },
  {
    name: 'Lamb Kofta with Cucumber Yogurt and Bulgur',
    serves: 4, active: 25, total: 45, protein: 'lamb',
    ing: ['12 oz lamb', '1/2 medium onion, grated', '2 clove garlic, minced', '1 tsp cumin', '1 tsp coriander', '1/2 tsp cinnamon', '1/4 cup parsley, chopped', '1 cup bulgur', '1 cup greek_yogurt', '1 cucumber, diced', '2 tomato, diced', '2 tbsp mint, chopped', '1 tbsp olive_oil', '1 tbsp lemon_juice'],
    steps: [
      'Mix the lamb, onion, garlic, spices and parsley and shape into 12 small logs.',
      'Pour 2 cups boiling water over the bulgur, cover 15 minutes and fluff.',
      'Cook the kofta in a hot pan or under the broiler 8 to 10 minutes, turning.',
      'Mix the yogurt with half the mint. Toss the cucumber and tomato with oil, lemon and the rest of the mint. Serve together.',
    ],
  },
  {
    name: 'Rosemary Pork Tenderloin with Sweet Potatoes and Brussels Sprouts',
    serves: 4, active: 20, total: 50, protein: 'pork',
    ing: ['12 oz pork_tenderloin', '2 tbsp olive_oil', '2 clove garlic, minced', '1 tsp rosemary', '1 tsp mustard', '2 medium sweet_potato, cubed', '4 cup brussels, halved', '1 tbsp maple_syrup', '1 tbsp balsamic', '3/4 cup quinoa, rinsed'],
    steps: [
      'Heat the oven to 425°F. Toss the sweet potatoes and Brussels sprouts with 1 tbsp oil and roast 15 minutes.',
      'Rub the pork with the remaining oil, garlic, rosemary and mustard and brown it in a skillet 2 minutes per side.',
      'Put the pork on the pan with the vegetables and roast 18 to 20 minutes, to 145°F. Rest 5 minutes.',
      'Meanwhile simmer the quinoa in 1 1/2 cups water, covered, 15 minutes.',
      'Toss the vegetables with maple syrup and balsamic. Slice the pork and serve with the quinoa.',
    ],
  },
  {
    name: 'Beef, Mushroom and Barley Stew',
    serves: 6, active: 25, total: 120, protein: 'beef', tags: ['batch-friendly', 'freezer'],
    ing: ['1 lb sirloin, cubed', '2 tbsp olive_oil', '1 medium onion, diced', '3 carrot, sliced', '2 celery, sliced', '1 package mushrooms, quartered', '3 clove garlic, minced', '2 tbsp tomato_paste', '3/4 cup barley', '6 cup chicken_broth', '2 cup water', '1 tsp thyme', '2 bay_leaf', '4 cup kale, chopped', '6 slice ww_bread'],
    steps: [
      'Brown the beef in 1 tbsp oil in batches. Set aside.',
      'Cook the onion, carrot, celery and mushrooms in the rest of the oil 10 minutes. Stir in the garlic and tomato paste for 1 minute.',
      'Add the beef, barley, broth, water, thyme and bay leaves. Cover and simmer 1 1/2 hours until tender.',
      'Stir in the kale for the last 10 minutes. Serve with whole-wheat bread.',
    ],
  },
  {
    name: 'Lamb and Chickpea Stew with Apricots',
    serves: 6, active: 25, total: 90, protein: 'lamb', tags: ['batch-friendly', 'freezer'],
    ing: ['12 oz lamb', '1 tbsp olive_oil', '1 medium onion, diced', '2 carrot, diced', '3 clove garlic, minced', '2 tsp cumin', '1 tsp cinnamon', '1 tsp paprika', '1 can diced_tomatoes', '2 can chickpeas, rinsed', '3 cup chicken_broth', '1/2 cup dried_apricots, chopped', '4 cup spinach', '1 cup couscous', '1/4 cup cilantro, chopped'],
    steps: [
      'Brown the lamb in the oil, breaking it up, 6 minutes. Pour off any extra fat.',
      'Add the onion and carrots for 6 minutes, then the garlic and spices for 1 minute.',
      'Add the tomatoes, chickpeas, broth and apricots and simmer 1 hour.',
      'Stir in the spinach. Pour 1 1/4 cups boiling water over the couscous, cover 5 minutes, and serve the stew over it with cilantro.',
    ],
  },

  // ---------------------------------------------------------------- beans, lentils, tofu, eggs, vegetables
  {
    name: 'Lentil Bolognese with Whole-Wheat Spaghetti',
    serves: 6, active: 20, total: 45, protein: 'lentils', tags: ['batch-friendly', 'freezer'],
    ing: ['2 tbsp olive_oil', '1 medium onion, diced', '2 carrot, finely diced', '2 celery, finely diced', '1 package mushrooms, finely chopped', '3 clove garlic, minced', '2 tbsp tomato_paste', '1 cup lentils, rinsed', '1 can crushed_tomatoes', '2 cup veg_broth', '1 tsp oregano', '12 oz ww_pasta', '1/3 cup parmesan', '1/4 cup basil, torn'],
    steps: [
      'Cook the onion, carrot, celery and mushrooms in the oil 10 minutes. Add the garlic and tomato paste for 1 minute.',
      'Add the lentils, tomatoes, broth and oregano and simmer 25 minutes until the lentils are tender.',
      'Cook the pasta and toss with the sauce. Top with Parmesan and basil.',
    ],
  },
  {
    name: 'Red Lentil and Spinach Dal',
    serves: 4, active: 15, total: 30, protein: 'lentils', tags: ['batch-friendly', 'freezer'],
    ing: ['1 tbsp olive_oil', '1 medium onion, diced', '3 clove garlic, minced', '1 tbsp ginger, grated', '2 tsp curry_powder', '1 tsp turmeric', '1 1/2 cup red_lentils, rinsed', '1 can diced_tomatoes', '4 cup water', '5 cup spinach', '2 tbsp lime_juice', '4 ww_pita', '1/2 cup greek_yogurt', '2 tbsp cilantro, chopped'],
    steps: ['Cook the onion in the oil 5 minutes. Add the garlic, ginger and spices for 1 minute.', 'Add the lentils, tomatoes and water and simmer 18 minutes, stirring, until thick.', 'Stir in the spinach and lime juice. Serve with yogurt, cilantro and warm pita.'],
  },
  {
    name: "Lentil Shepherd's Pie with Sweet Potato Topping",
    serves: 6, active: 30, total: 75, protein: 'lentils', tags: ['batch-friendly', 'freezer'],
    ing: ['3 medium sweet_potato, cubed', '1/2 cup milk', '2 tbsp olive_oil', '1 medium onion, diced', '2 carrot, diced', '2 celery, diced', '1 package mushrooms, chopped', '3 clove garlic, minced', '2 tbsp tomato_paste', '1 1/4 cup lentils, rinsed', '3 cup veg_broth', '1 tsp thyme', '1 cup peas', '4 cup greens', '1 tbsp balsamic'],
    steps: [
      'Boil the sweet potatoes 15 minutes, drain and mash with the milk.',
      'Cook the onion, carrot, celery and mushrooms in the oil 10 minutes. Add the garlic and tomato paste.',
      'Add the lentils, broth and thyme and simmer 25 minutes until thick. Stir in the peas.',
      'Spread in a baking dish, top with the mash and bake at 400°F for 20 minutes. Serve with a green salad.',
    ],
  },
  {
    name: 'Mujadara: Lentils and Rice with Caramelized Onions',
    serves: 4, active: 20, total: 60, protein: 'lentils',
    ing: ['3 tbsp olive_oil', '3 medium onion, thinly sliced', '1 cup lentils, rinsed', '3/4 cup brown_rice', '1 tsp cumin', '1/2 tsp cinnamon', '4 cup water', '1 cup greek_yogurt', '1 cucumber, diced', '2 tomato, diced', '1/4 cup parsley, chopped', '1 tbsp lemon_juice'],
    steps: [
      'Cook the onions in the oil over medium-low heat, stirring often, 25 to 30 minutes until deep brown.',
      'Meanwhile simmer the lentils, rice, cumin and cinnamon in the water, covered, 40 minutes until tender.',
      'Stir half the onions into the lentils and rice and pile the rest on top.',
      'Serve with yogurt and a cucumber-tomato-parsley salad dressed with lemon.',
    ],
  },
  {
    name: 'Chickpea and Spinach Stew with Tomatoes',
    serves: 4, active: 15, total: 25, protein: 'chickpeas',
    ing: ['2 tbsp olive_oil', '1 medium onion, diced', '3 clove garlic, minced', '1 tsp cumin', '1 tsp paprika', '2 can chickpeas, rinsed', '1 can diced_tomatoes', '1 cup veg_broth', '6 cup spinach', '1/4 cup feta, crumbled', '4 slice sourdough'],
    steps: ['Cook the onion in the oil 5 minutes, then the garlic and spices for 1 minute.', 'Add the chickpeas, tomatoes and broth and simmer 12 minutes, mashing a few chickpeas.', 'Stir in the spinach until wilted. Top with feta and serve with toasted bread.'],
  },
  {
    name: 'Chickpea and Cauliflower Curry',
    serves: 4, active: 20, total: 40, protein: 'chickpeas', tags: ['batch-friendly'],
    ing: ['1 tbsp olive_oil', '1 medium onion, diced', '3 clove garlic, minced', '1 tbsp ginger, grated', '2 tbsp curry_powder', '1 head cauliflower, florets', '2 can chickpeas, rinsed', '1 can diced_tomatoes', '1 cup veg_broth', '1/2 cup greek_yogurt', '4 cup spinach', '1 cup brown_rice', '2 tbsp cilantro, chopped'],
    steps: ['Start the rice (about 40 minutes).', 'Cook the onion in the oil 5 minutes; add the garlic, ginger and curry powder for 1 minute.', 'Add the cauliflower, chickpeas, tomatoes and broth, cover and simmer 20 minutes.', 'Stir in the spinach, then the yogurt off the heat. Serve over rice with cilantro.'],
  },
  {
    name: 'Chickpea and Vegetable Tagine with Couscous',
    serves: 6, active: 25, total: 60, protein: 'chickpeas', tags: ['batch-friendly', 'freezer'],
    ing: ['2 tbsp olive_oil', '1 medium onion, diced', '3 clove garlic, minced', '2 tsp cumin', '1 tsp cinnamon', '1 tsp paprika', '1 butternut, cubed', '2 carrot, sliced', '1 zucchini, chunks', '2 can chickpeas, rinsed', '1 can diced_tomatoes', '2 cup veg_broth', '1/3 cup raisins', '1 1/2 cup couscous', '1/4 cup almonds, sliced', '1/4 cup cilantro, chopped'],
    steps: [
      'Cook the onion in the oil 6 minutes, add the garlic and spices for 1 minute.',
      'Add the squash, carrots, chickpeas, tomatoes, broth and raisins and simmer 30 minutes. Add the zucchini for the last 10.',
      'Pour 2 cups boiling water over the couscous, cover 5 minutes and fluff.',
      'Serve the tagine over couscous with almonds and cilantro.',
    ],
  },
  {
    name: 'Baked Falafel Patties with Tahini Salad',
    serves: 4, active: 25, total: 45, protein: 'chickpeas',
    ing: ['2 can chickpeas, rinsed and dried', '1/2 cup parsley', '1/2 cup cilantro', '1/2 medium onion', '3 clove garlic', '2 tsp cumin', '1 tsp coriander', '1/3 cup ww_flour', '3 tbsp olive_oil', '1/4 cup tahini', '3 tbsp lemon_juice', '4 cup romaine, chopped', '2 tomato, diced', '1 cucumber, diced', '4 ww_pita'],
    steps: [
      'Heat the oven to 400°F. Pulse the chickpeas, herbs, onion, garlic and spices in a food processor until coarse. Mix in the flour.',
      'Shape into 16 patties, brush with 2 tbsp oil and bake 25 minutes, turning halfway.',
      'Whisk the tahini, lemon juice and a few tablespoons of water. Toss the lettuce, tomato and cucumber with the rest of the oil.',
      'Serve the falafel in pita with salad and tahini sauce.',
    ],
  },
  {
    name: 'Stuffed Eggplant with Chickpeas and Tomatoes',
    serves: 4, active: 25, total: 70, protein: 'chickpeas',
    ing: ['2 eggplant, halved lengthwise', '3 tbsp olive_oil', '1 medium onion, diced', '3 clove garlic, minced', '1 tsp cumin', '1 tsp allspice', '1 can chickpeas, rinsed', '1 can diced_tomatoes', '1/4 cup parsley, chopped', '1/3 cup feta, crumbled', '2 tbsp pine_nuts', '1 cup bulgur'],
    steps: [
      'Heat the oven to 400°F. Score the eggplant flesh, brush with 1 tbsp oil and roast cut-side down 25 minutes.',
      'Scoop out the soft centers, leaving a shell. Cook the onion in the rest of the oil 6 minutes, add the garlic, spices, chopped eggplant, chickpeas and tomatoes and simmer 10 minutes.',
      'Fill the shells, top with feta and pine nuts and bake 20 minutes.',
      'Meanwhile pour 2 cups boiling water over the bulgur, cover 15 minutes. Serve with parsley.',
    ],
  },
  {
    name: 'Tuscan White Bean and Kale Skillet',
    serves: 4, active: 15, total: 20, protein: 'white-beans',
    ing: ['2 tbsp olive_oil', '4 clove garlic, sliced', '1 pinch red_pepper_flakes', '2 can white_beans, rinsed', '1 pint cherry_tomatoes', '8 cup kale, chopped', '1 cup veg_broth', '1/3 cup parmesan', '1 tbsp lemon_juice', '4 slice sourdough', '4 large egg'],
    steps: [
      'Warm the oil, garlic and pepper flakes 1 minute. Add the tomatoes and cook 4 minutes until they burst.',
      'Add the kale and broth, cover and cook 5 minutes. Stir in the beans.',
      'Make 4 wells, crack in the eggs, cover and cook 5 minutes until set.',
      'Finish with lemon and Parmesan. Serve with toasted bread.',
    ],
  },
  {
    name: 'Pasta e Fagioli',
    serves: 4, active: 20, total: 45, protein: 'white-beans', tags: ['batch-friendly'],
    ing: ['2 tbsp olive_oil', '1 medium onion, diced', '2 carrot, diced', '2 celery, diced', '3 clove garlic, minced', '1 tsp rosemary', '1 can diced_tomatoes', '2 can white_beans, rinsed', '4 cup veg_broth', '2 cup water', '1 cup ww_pasta', '4 cup spinach', '1/3 cup parmesan'],
    steps: ['Cook the onion, carrot and celery in the oil 8 minutes. Add the garlic and rosemary.', 'Add the tomatoes, beans, broth and water and simmer 15 minutes. Mash some of the beans to thicken.', 'Add the pasta and cook 10 minutes. Stir in the spinach and serve with Parmesan.'],
  },
  {
    name: 'Greek Baked Giant Beans (Gigantes)',
    serves: 6, active: 20, total: 75, protein: 'white-beans', tags: ['batch-friendly'],
    ing: ['3 can white_beans, rinsed', '3 tbsp olive_oil', '1 medium onion, diced', '2 carrot, diced', '1 celery, diced', '3 clove garlic, minced', '1 can crushed_tomatoes', '1 tsp oregano', '1/2 cup dill, chopped', '1/2 cup feta, crumbled', '6 slice sourdough', '4 cup greens'],
    steps: [
      'Heat the oven to 375°F. Cook the onion, carrot and celery in 2 tbsp oil 10 minutes. Add the garlic.',
      'Stir in the tomatoes, oregano and half the dill. Fold in the beans and pour into a baking dish.',
      'Drizzle with the rest of the oil and bake 45 minutes until bubbling and thick.',
      'Top with feta and the rest of the dill. Serve with bread and a green salad.',
    ],
  },
  {
    name: 'Black Bean and Sweet Potato Enchiladas',
    serves: 4, active: 30, total: 60, protein: 'black-beans', tags: ['batch-friendly', 'freezer'],
    ing: ['2 medium sweet_potato, diced', '1 tbsp olive_oil', '1 medium onion, diced', '2 can black_beans, rinsed', '2 tsp cumin', '1 tsp chili_powder', '4 cup spinach', '12 corn_tortilla', '1 can tomato_sauce', '1 cup salsa', '3/4 cup cheddar', '1/4 cup cilantro, chopped', '1/2 cup greek_yogurt'],
    steps: [
      'Heat the oven to 400°F. Roast the sweet potato with the oil 20 minutes.',
      'Cook the onion 5 minutes, add the beans, spices, spinach and roasted sweet potato and mash lightly.',
      'Mix the tomato sauce and salsa and spread a little in a baking dish. Fill and roll the warmed tortillas and lay them seam-side down.',
      'Pour over the rest of the sauce, top with cheese and bake 20 minutes. Serve with yogurt and cilantro.',
    ],
  },
  {
    name: 'Black Bean Burgers with Side Salad',
    serves: 4, active: 25, total: 25, protein: 'black-beans',
    ing: ['2 can black_beans, rinsed and dried', '1/2 cup oats', '1 large egg', '1/2 cup red_pepper, minced', '2 scallion, sliced', '1 tsp cumin', '1 tsp paprika', '1 tbsp olive_oil', '4 english_muffin', '1 avocado', '1 tomato, sliced', '4 cup greens', '1 tbsp olive_oil', '1 tbsp red_wine_vinegar'],
    steps: [
      'Mash the beans, leaving some whole. Mix in the oats, egg, pepper, green onions and spices. Shape 4 patties.',
      'Cook in 1 tbsp oil over medium heat 5 minutes per side until crisp.',
      'Serve on toasted English muffins with avocado and tomato, and greens dressed with oil and vinegar.',
    ],
  },
  {
    name: 'Three-Bean Vegetable Chili',
    serves: 6, active: 20, total: 50, protein: 'mixed-beans', tags: ['batch-friendly', 'freezer'],
    ing: ['2 tbsp olive_oil', '1 medium onion, diced', '2 red_pepper, diced', '1 zucchini, diced', '4 clove garlic, minced', '2 tbsp chili_powder', '2 tsp cumin', '1 can crushed_tomatoes', '1 can kidney_beans, rinsed', '1 can black_beans, rinsed', '1 can pinto_beans, rinsed', '2 cup veg_broth', '1 cup corn', '1/2 cup greek_yogurt', '1 avocado, diced'],
    steps: ['Cook the onion, peppers and zucchini in the oil 8 minutes. Add the garlic and spices for 1 minute.', 'Add the tomatoes, beans, broth and corn and simmer 30 minutes.', 'Serve with yogurt and avocado.'],
  },
  {
    name: 'Ratatouille with Chickpeas over Polenta',
    serves: 6, active: 30, total: 75, protein: 'chickpeas', tags: ['batch-friendly'],
    ing: ['3 tbsp olive_oil', '1 medium onion, diced', '1 eggplant, cubed', '2 zucchini, cubed', '2 red_pepper, diced', '4 clove garlic, minced', '1 can crushed_tomatoes', '1 can chickpeas, rinsed', '1 tsp thyme', '1/2 cup basil, torn', '1 1/2 cup cornmeal', '6 cup water', '1/2 cup parmesan'],
    steps: [
      'Cook the onion and eggplant in the oil 10 minutes. Add the zucchini and peppers for 8 minutes, then the garlic.',
      'Add the tomatoes, chickpeas and thyme and simmer 30 minutes. Stir in the basil.',
      'Whisk the cornmeal into the boiling water and cook over low heat, stirring often, 25 minutes. Stir in the Parmesan.',
      'Serve the ratatouille over the polenta.',
    ],
  },
  {
    name: 'Tofu and Vegetable Stir-Fry with Whole-Wheat Noodles',
    serves: 4, active: 20, total: 25, protein: 'tofu',
    ing: ['1 block tofu, cubed', '8 oz ww_pasta', '2 tbsp olive_oil', '1 head broccoli, florets', '1 red_pepper, sliced', '2 cup cabbage, shredded', '2 clove garlic, minced', '1 tbsp ginger, grated', '3 tbsp soy_sauce', '2 tbsp peanut_butter', '1 tbsp lime_juice', '1 tsp honey', '3 scallion, sliced'],
    steps: [
      'Cook the pasta (spaghetti works well) and drain.',
      'Pat the tofu dry and brown in 1 tbsp oil 8 minutes. Set aside.',
      'Stir-fry the vegetables in the rest of the oil 5 minutes, add the garlic and ginger.',
      'Whisk the soy sauce, peanut butter, lime and honey with 3 tbsp water. Toss everything together with the noodles and green onions.',
    ],
  },
  {
    name: 'Crispy Tofu with Peanut Sauce, Broccoli and Quinoa',
    serves: 4, active: 25, total: 40, protein: 'tofu',
    ing: ['1 block tofu, cubed', '1 tbsp olive_oil', '1 cup quinoa, rinsed', '1 head broccoli, florets', '2 carrot, sliced', '3 tbsp peanut_butter', '2 tbsp soy_sauce', '1 tbsp lime_juice', '1 tsp honey', '1 clove garlic, grated', '2 tbsp cilantro, chopped'],
    steps: [
      'Heat the oven to 425°F. Toss the tofu with the oil and bake 25 minutes, turning once. Roast the broccoli and carrots on another pan for the last 15 minutes.',
      'Simmer the quinoa in 2 cups water, covered, 15 minutes.',
      'Whisk the peanut butter, soy sauce, lime, honey, garlic and 3 tbsp warm water.',
      'Serve the tofu and vegetables over quinoa with sauce and cilantro.',
    ],
  },
  {
    name: 'Greek Vegetable Frittata with Potatoes',
    serves: 4, active: 20, total: 40, protein: 'eggs',
    ing: ['8 large egg', '1/4 cup milk', '2 tbsp olive_oil', '3/4 lb potato, thinly sliced', '1 medium onion, sliced', '4 cup spinach', '1/2 cup roasted_peppers, sliced', '1/3 cup feta, crumbled', '1 tsp oregano', '4 cup greens', '1 tomato', '1 tbsp red_wine_vinegar'],
    steps: [
      'Heat the oven to 375°F. Cook the potatoes and onion in the oil in an oven-safe skillet, covered, 12 minutes until tender.',
      'Add the spinach and peppers until wilted.',
      'Whisk the eggs, milk and oregano and pour in. Top with feta and bake 15 minutes until set.',
      'Serve with a tomato and greens salad.',
    ],
  },
  {
    name: 'Mushroom and Spinach Pita Pizzas',
    serves: 4, active: 15, total: 20, protein: 'cheese',
    ing: ['4 ww_pita', '1 cup marinara', '1 package mushrooms, sliced', '3 cup spinach', '1 cup mozzarella, shredded', '1/2 cup white_beans, rinsed', '1/4 cup olives, sliced', '1 tsp oregano', '4 cup arugula', '1 tbsp olive_oil', '1 tbsp balsamic'],
    steps: ['Heat the oven to 425°F. Cook the mushrooms in a dry pan 5 minutes, add the spinach to wilt.', 'Spread the pitas with marinara, add the vegetables, beans, olives, oregano and cheese.', 'Bake 10 minutes until bubbly. Serve with arugula dressed with oil and balsamic.'],
  },
  {
    name: 'Lightened Eggplant Parmesan Stacks',
    serves: 4, active: 30, total: 60, protein: 'cheese',
    ing: ['2 eggplant, sliced in rounds', '2 tbsp olive_oil', '1 jar marinara', '1 cup ricotta', '1 cup mozzarella, shredded', '1/3 cup parmesan', '1/2 cup basil, torn', '8 oz ww_pasta', '4 cup greens'],
    steps: [
      'Heat the oven to 425°F. Brush the eggplant with oil and roast 20 minutes, turning once.',
      'Layer eggplant, marinara, ricotta and basil in a baking dish, twice. Top with mozzarella and Parmesan.',
      'Bake 20 minutes until bubbling. Serve with pasta tossed with a little sauce, and a green salad.',
    ],
  },
  {
    name: 'Pesto Zucchini Pasta with Peas and Ricotta',
    serves: 4, active: 15, total: 25, protein: 'cheese',
    ing: ['10 oz ww_pasta', '2 zucchini, diced', '1 tbsp olive_oil', '2 cup peas', '1/3 cup pesto', '3/4 cup ricotta', '1 tsp lemon_zest', '2 tbsp lemon_juice', '1/4 cup parmesan', '1 can white_beans, rinsed'],
    steps: ['Cook the pasta, adding the peas for the last 2 minutes. Save 1/2 cup water.', 'Cook the zucchini in the oil 5 minutes. Add the beans to warm.', 'Toss everything with pesto, lemon and pasta water. Top with spoonfuls of ricotta and Parmesan.'],
  },
]);
