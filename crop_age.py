#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Apr  4 10:17:23 2022

@author: shashank
"""

import pandas as pd
import json
from natsort import natsorted
import matplotlib.pyplot as plt
from datetime import datetime as dt
import numpy as np
import warnings
warnings.filterwarnings("ignore")
# %%
# read farm csv
#bihar_farms = pd.read_csv('D:/PYTHON_VERSIONS/python_3.9.5/PYTHON_PROJECTS/bihar/bihar_profile_farm.csv')
path = '/home/satyukt/Downloads/NDVI_Time_Series1_oct_mar_pos.csv'
bihar_farms = pd.read_csv(path, usecols= [ 'date', 'fid', 'NDVI', 'Position'])
# print(bihar_farms.head())
# %%
# filtering names and coordinates to readable values
# names = bihar_farms['NAME'].values
# names_re = [x.split('_')[0][:8]+'_'+x.split('_')[-2] for x in names]
# bihar_farms['NAME'] = names_re
names = bihar_farms['fid'].values
names_re = [str(x) for x in names]
bihar_farms['fid'] = names_re
coordinates = bihar_farms['Position'].values
pos = [json.loads(x)['coordinates'] for x in coordinates]
bihar_farms['Position'] = pos
# print(bihar_farms.head())
# %%
# adjust dates (sylesh)
dates_ = [x[:10] for x in bihar_farms['date'].values]
bihar_farms['date'] = dates_
# %%
# separate the position elements into long and lat values for easier plotting in qgis
bihar_farms['LONG'] = [x[0] for x in bihar_farms['Position'].values]
bihar_farms['LAT'] = [x[1] for x in bihar_farms['Position'].values]
del bihar_farms['Position']
print(bihar_farms.head())
# %%
# get unique point id
# unique_points = natsorted(list(set(['_'+str(x.split('_')[1]) for x in names_re])))
unique_points = natsorted(list(set([str(x) for x in bihar_farms['fid'].values])))
print(unique_points[:10])
# %%
# create a dataframe for farms and their sowing and harvesting dates
farms_df = pd.DataFrame(columns=['ID', 'SOWING', 'HARVESTING', 'AGE', 'LONG', 'LAT']) #, 'DATES', 'NDVI'] )
print(farms_df)
farms_df.shape
# %%
# populate date and age for each farm
bihar_farms_clone = bihar_farms
# print(bihar_farms_clone.head())
for bfarm in unique_points:
    print('processing farm : ',bfarm)
    # temp = bihar_farms_clone[bihar_farms_clone['NAME'].str.endswith(str(bfarm))]
    #temp = bihar_farms_clone[bihar_farms_clone['fid'] == bfarm]
    temp = bihar_farms_clone.loc[np.isin(bihar_farms_clone['fid'], bfarm)]
    ndvi = temp['NDVI'].values
    # dates = [dt.strptime(str(x).replace(str(bfarm),''), '%Y%m%d') for x in temp['NAME'].values]
    dates = [dt.strptime(x, '%Y-%m-%d') for x in temp['date'].values]
    # longitude = list(temp['LONG'].values[:1])[0]
    # longitude = temp['LONG'].values
    # latitude = list(temp['LAT'].values[:1])[0]
    longitude  = np.unique(np.array(temp['LONG'].values))[0]
    latitude = np.unique(np.array(temp['LAT'].values))[0]
    # print(dates)
    # print(longitude, latitude)
    temp_dates = []
    for i, val in enumerate(ndvi):
        if val <= 0.15:
            temp_dates.append(dates[i])
    # print(temp_dates)
    # temp_dates_dif = []
    for m in range(len(temp_dates)-1) :
        diff = (temp_dates[m+1] - temp_dates[m]).days
        # print(diff)
        if  diff > 60 :
            sowing = temp_dates[m].strftime('%Y-%m-%d')
            harvesting = temp_dates[m+1].strftime('%Y-%m-%d')
            # for creating NDVI profile and getting peak date
            start = dates.index(temp_dates[m])
            end = dates.index(temp_dates[m+1])+1
            dates_temp = dates[start:end]
            date_lis = [x.strftime('%Y-%m-%d') for x in dates_temp]
            ndvi_lis = ndvi[start:end]
            idx = np.argmax(ndvi_lis)#ndvi_lis.index(max(ndvi_lis))
            peak_date = dates_temp[idx]
            peak_days = (peak_date - temp_dates[m]).days
            #####################
            days = (temp_dates[m+1] - temp_dates[m]).days
            #print(bfarm, sowing, harvesting, days, longitude, latitude, peak_days)
            farms_df = farms_df.append(pd.DataFrame([[bfarm, sowing, harvesting, days, longitude, latitude]], columns = ['ID', 'SOWING', 'HARVESTING', 'AGE', 'LONG', 'LAT']), ignore_index = True)
            print(farms_df.shape)
    # bihar_farms_clone.drop(bihar_farms_clone[bihar_farms_clone['NAME'] == bfarm].index, inplace=True)
# %%
# farms_df
# plot_farm_df = farms_df[['ID', 'DATES', 'NDVI']] # for plotting
# plot_farm_df.to_csv('bihar_plot.csv', index=False)
# %%
# output
# farms_df.drop(['DATES', 'NDVI'], axis=1, inplace=True)
# print(farms_df.shape)
# print(farms_df.head(10))   
farms_df.to_csv('/media/edrive1/Shashank/Shashank_Projects/sai/csv/BIKANER_farm.csv',index=False)
# %%
# rabi and kharif
path_ = '/media/edrive1/Shashank/Shashank_Projects/sai/csv/BIKANER_farm.csv'
pro_farm = pd.read_csv(path_)
# pro_farm = farms_df
# %%
# date ranges for crops
Bengal_Gram_rabi = [(dt.strptime('2022-03-31', '%Y-%m-%d') - dt.strptime('2021-10-25', '%Y-%m-%d')).days]
wheat_rabi = [(dt.strptime('2022-02-28', '%Y-%m-%d') - dt.strptime('2021-11-10', '%Y-%m-%d')).days]
Mustard_rabi = [(dt.strptime('2022-03-16', '%Y-%m-%d') - dt.strptime('2021-10-15', '%Y-%m-%d')).days]
print(Bengal_Gram_rabi, wheat_rabi, Mustard_rabi, sep='\n')
# %%
# processing
# print(pro_farm)
pro_farm['HARVESTING'] = [dt.strptime(x, '%Y-%m-%d') for x in pro_farm['HARVESTING'].values]
# bihar (Darbangha-Samastipur) crop calendar
# Rice (kharif) ->  <= 95 days -> (15th may to 31st july) -> (15th sep to 30th nov) -> Major
# Wheat (rabi) -> 180 to 240 days -> (1st nov to 1st dec) -> (1st mar to 1st apr) -> Major
# maize (kharif) -> 95 to 100 days -> (15th june to 15th july) -> (15th sep to 15th oct) -> Major
# maize (rabi) -> 95 to 100 days -> (15th oct to 30th nov) -> (15th mar to 15th apr) -> Major
# maize (summer) -> 95 to 100 days -> (1st feb to 31st mar) -> (1st jun to 31st july)
# Ragi (kharif) -> 120 to 135 days -> (15th june to 15th aug) -> (15th sep to 31st oct)
# Arhar (kharif) -> 200 to 280days -> (1st june to 31st july) -> (1st mar to 30th apr)
# Gram (rabi) -> 150 to 180 days -> (15th nov to 31st dec) -> (1st apr to 15th apr)
# Lentil (rabi) -> 80 to 110 days -> (15th oct to 15th nov) -> (15th mar to 15th apr)
# Peas (rabi) -> 60 to 70 days -> (15th oct to 30th nov) -> (15th feb to 15th mar)
# Til (summer) -> 90 to 100 days -> (15th feb to 15th mar) -> (15th may to 30th june)
# Mustard (rabi) -> 110 to 140 days -> (15th oct to 15th nov) -> (15th feb to 15th mar)
# Linseed (rabi) -> 120 to 125 days -> (15th oct to 15th nov) -> (15th mar to 15th apr)
# %%
# rabi ###########
# pulses rabi -> lentil
# oilseeds rabi -> mustard
gram_rabi  = pro_farm[((pro_farm['AGE'] >= 100) & (pro_farm['AGE'] <= 125)) & ((pro_farm['HARVESTING'] >= dt.strptime('2022-02-15', '%Y-%m-%d')) & (pro_farm['HARVESTING'] <= dt.strptime('2022-03-10', '%Y-%m-%d')))]
wheat_rabi  = pro_farm[((pro_farm['AGE'] >= 110) & (pro_farm['AGE'] <= 145)) & ((pro_farm['HARVESTING'] >= dt.strptime('2022-03-01', '%Y-%m-%d')) & (pro_farm['HARVESTING'] <= dt.strptime('2022-03-31', '%Y-%m-%d')))]
mustard_rabi = pro_farm[((pro_farm['AGE'] >= 115) & (pro_farm['AGE'] <= 135)) & ((pro_farm['HARVESTING'] >= dt.strptime('2022-02-26', '%Y-%m-%d')) & (pro_farm['HARVESTING'] <= dt.strptime('2022-03-20', '%Y-%m-%d')))]
###############
# sugarcane ####
# sugarcane_rabi = pro_farm[(pro_farm['HARVESTING'] < dt.strptime('2021-04-30', '%Y-%m-%d')) & (pro_farm['HARVESTING'] > dt.strptime('2021-03-01', '%Y-%m-%d')) & (pro_farm['AGE'] > 250)]
###############
print(gram_rabi.shape, wheat_rabi.shape,  mustard_rabi.shape)
# kharif_farms = pro_farm[((pro_farm['HARVESTING'] < dt.strptime('2021-11-30', '%Y-%m-%d')) & (pro_farm['HARVESTING'] > dt.strptime('2021-10-01', '%Y-%m-%d'))) | ((pro_farm['HARVESTING'] < dt.strptime('2020-11-30', '%Y-%m-%d')) & (pro_farm['HARVESTING'] > dt.strptime('2020-10-01', '%Y-%m-%d')))]
# rice_farms_kharif = kharif_farms[(kharif_farms['AGE'] <= 95)]
# maize_farms_kharif = kharif_farms[(kharif_farms['AGE'] > 95) & (kharif_farms['AGE'] <=100)]
# rabi_farms = pro_farm[(pro_farm['HARVESTING'] < dt.strptime('2021-05-31', '%Y-%m-%d')) & (pro_farm['HARVESTING'] > dt.strptime('2021-03-01', '%Y-%m-%d'))]
# wheat_farms = rabi_farms[(rabi_farms['AGE'] <= 250) & (rabi_farms['AGE'] > 180)]
# maize_farms_rabi = rabi_farms[(rabi_farms['AGE'] > 95) & (rabi_farms['AGE'] <=100)]
# sugarcane_farms = pro_farm[(pro_farm['HARVESTING'] < dt.strptime('2021-04-30', '%Y-%m-%d')) & (pro_farm['HARVESTING'] > dt.strptime('2021-03-10', '%Y-%m-%d')) & (pro_farm['AGE'] >= 250)]
# print(rabi_farms.shape, kharif_farms.shape)
# print(rice_farms_kharif.shape, maize_farms_kharif.shape, maize_farms_rabi.shape, wheat_farms.shape, sugarcane_farms.shape)
# %%
# crop_points
path = "/media/edrive1/Shashank/Shashank_Projects/sai/csv/crop_csv/"
gram_rabi.to_csv(path+'maize_rabi.csv', index=False)
wheat_rabi.to_csv(path+'wheat_rabi.csv', index=False)
mustard_rabi.to_csv(path+'mustard_rabi.csv', index=False)














